import { useEffect, useMemo, useState } from 'react';
import { CloudSun, ImagePlus, Lightbulb, Newspaper, Sprout, TrendingUp } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { marketPriceService, orderService, productService } from '../../services';
import { formatCurrency } from '../../utils/helpers';
import api from '../../services/api';

const schemes = [
  { title: 'PM-KISAN', text: 'Income support for eligible landholding farmer families. Check current eligibility and installment status on the official portal.', url: 'https://pmkisan.gov.in/' },
  { title: 'PM Fasal Bima Yojana', text: 'Crop insurance support against specified natural risks. Enrollment windows depend on crop and season.', url: 'https://pmfby.gov.in/' },
  { title: 'e-NAM', text: 'National electronic trading platform connecting agricultural markets.', url: 'https://www.enam.gov.in/' },
];

export default function FarmerInsights() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [prices, setPrices] = useState([]);
  const [weather, setWeather] = useState(null);
  const [question, setQuestion] = useState('');
  const [photo, setPhoto] = useState(null);
  const [answer, setAnswer] = useState('');
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    Promise.all([productService.getMyProducts(), orderService.getAll(), marketPriceService.getAll()])
      .then(([p, o, m]) => { setProducts(p.data.data || []); setOrders(o.data.data || []); setPrices(m.data.data || []); })
      .catch(() => toast.error('Some farm insights could not be loaded'));
  }, []);

  useEffect(() => {
    const place = user?.farmLocation || user?.location;
    if (!place) return;
    const loadWeather = async () => {
      try {
        const geo = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(place.split(',')[0])}&count=1&language=en&format=json`).then(r => r.json());
        const point = geo.results?.[0];
        if (!point) return;
        const data = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${point.latitude}&longitude=${point.longitude}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&forecast_days=5&timezone=auto`).then(r => r.json());
        setWeather(data.daily?.time?.map((day, i) => ({ day, high: data.daily.temperature_2m_max[i], low: data.daily.temperature_2m_min[i], rain: data.daily.precipitation_probability_max[i] })) || []);
      } catch { setWeather([]); }
    };
    loadWeather();
  }, [user?.farmLocation, user?.location]);

  const revenue = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(); date.setMonth(date.getMonth() - (5 - index));
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      return { key, month: date.toLocaleString('en-IN', { month: 'short' }), revenue: 0 };
    });
    orders.filter(o => o.status === 'Delivered').forEach(o => {
      const date = new Date(o.deliveredAt || o.updatedAt || o.createdAt);
      const row = months.find(m => m.key === `${date.getFullYear()}-${date.getMonth()}`);
      if (row) row.revenue += Number(o.farmerPayoutAmount || o.totalAmount || 0);
    });
    return months;
  }, [orders]);
  const buyers = useMemo(() => {
    const counts = new Map();
    orders.forEach(o => { const id = o.buyer?._id || o.buyer; if (id) counts.set(id, (counts.get(id) || 0) + 1); });
    return counts.size ? [...counts.values()].filter(n => n > 1).length : 0;
  }, [orders]);
  const suggestions = useMemo(() => products.map(product => {
    const match = prices.find(p => p.crop?.toLowerCase() === product.name?.toLowerCase() || p.crop?.toLowerCase() === product.name?.split(' ')[0]?.toLowerCase());
    const price = Number(match?.currentPrice || match?.price || 0);
    return { ...product, marketPrice: price, difference: price ? price - Number(product.pricePerUnit) : null };
  }).filter(p => p.marketPrice), [products, prices]);
  const topProducts = useMemo(() => [...products].sort((a, b) => (b.soldCount || 0) - (a.soldCount || 0)).slice(0, 5).map(p => ({ name: p.name, sold: p.soldCount || 0 })), [products]);
  const upcoming = products.filter(p => p.harvestDate && new Date(p.harvestDate) > new Date()).sort((a, b) => new Date(a.harvestDate) - new Date(b.harvestDate));

  const ask = async (e) => {
    e.preventDefault(); setAsking(true); setAnswer('');
    try {
      const body = new FormData(); body.append('question', question || 'Please identify possible crop issues from this photo and suggest safe next steps.');
      if (photo) body.append('image', photo);
      const { data } = await api.post('/advice/crop', body);
      setAnswer(data.answer);
    } catch (err) { setAnswer(err.message); }
    finally { setAsking(false); }
  };

  return <div className="space-y-6">
    <header><h2 className="text-2xl font-bold text-gray-900">Farm Insights</h2><p className="text-sm text-gray-500 mt-1">Sales trends, crop planning, local weather and market guidance.</p></header>
    <section className="grid sm:grid-cols-3 gap-4">
      <div className="card p-4"><p className="text-sm text-gray-500">Repeat buyers</p><p className="text-2xl font-bold">{buyers}</p></div>
      <div className="card p-4"><p className="text-sm text-gray-500">Upcoming harvests</p><p className="text-2xl font-bold">{upcoming.length}</p></div>
      <div className="card p-4"><p className="text-sm text-gray-500">Products with market match</p><p className="text-2xl font-bold">{suggestions.length}</p></div>
    </section>
    <section className="grid lg:grid-cols-2 gap-5">
      <div className="card p-5"><h3 className="font-bold flex gap-2 items-center"><TrendingUp className="w-4 h-4"/> Revenue by month</h3><div className="h-64 mt-4"><ResponsiveContainer width="100%" height="100%"><BarChart data={revenue}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="month"/><YAxis/><Tooltip formatter={v => formatCurrency(v)}/><Bar dataKey="revenue" fill="#16a34a" radius={[5,5,0,0]}/></BarChart></ResponsiveContainer></div></div>
      <div className="card p-5"><h3 className="font-bold flex gap-2 items-center"><Sprout className="w-4 h-4"/> Top products by units sold</h3>{topProducts.length ? <div className="h-64 mt-4"><ResponsiveContainer width="100%" height="100%"><BarChart data={topProducts} layout="vertical"><CartesianGrid strokeDasharray="3 3"/><XAxis type="number"/><YAxis type="category" dataKey="name" width={90}/><Tooltip/><Bar dataKey="sold" fill="#65a30d" radius={[0,5,5,0]}/></BarChart></ResponsiveContainer></div> : <p className="text-sm text-gray-500 mt-6">Add products to see sales rankings.</p>}</div>
    </section>
    <section className="card p-5"><h3 className="font-bold">Market price suggestions</h3><p className="text-xs text-gray-500 mt-1">Indicative comparison against the latest matching mandi price in your market table.</p><div className="mt-3 divide-y">{suggestions.map(p => <div key={p._id} className="py-3 flex flex-wrap justify-between gap-2 text-sm"><span className="font-medium">{p.name} · Your price {formatCurrency(p.pricePerUnit)}/{p.unit}</span><span className={p.difference > 0 ? 'text-green-700' : 'text-amber-700'}>Mandi {formatCurrency(p.marketPrice)} · {p.difference > 0 ? `Consider +${formatCurrency(p.difference)}` : `Above mandi by ${formatCurrency(Math.abs(p.difference))}`}</span></div>)}{!suggestions.length && <p className="py-3 text-sm text-gray-500">Add matching crop names to the market price table to get suggestions.</p>}</div></section>
    <section className="grid lg:grid-cols-2 gap-5">
      <div className="card p-5"><h3 className="font-bold flex gap-2 items-center"><CloudSun className="w-4 h-4"/> 5-day weather · {user?.farmLocation || user?.location || 'Farm location'}</h3>{weather?.length ? <div className="mt-3 grid grid-cols-2 sm:grid-cols-5 gap-2">{weather.map(d => <div key={d.day} className="rounded-lg bg-sky-50 p-3 text-sm"><b>{new Date(d.day).toLocaleDateString('en-IN',{weekday:'short'})}</b><p>{Math.round(d.high)}° / {Math.round(d.low)}°C</p><p className="text-sky-700">Rain {d.rain}%</p></div>)}</div> : <p className="text-sm text-gray-500 mt-3">Weather forecast unavailable. Add your farm location to your profile.</p>}</div>
      <div className="card p-5"><h3 className="font-bold">Upcoming harvests & pre-orders</h3><p className="text-xs text-gray-500 mt-1">Create a product with a future harvest date in My Products so buyers can plan ahead.</p>{upcoming.length ? <ul className="mt-3 space-y-2">{upcoming.map(p => <li key={p._id} className="flex justify-between text-sm"><span>{p.name} · {p.quantity} {p.unit}</span><span>{new Date(p.harvestDate).toLocaleDateString()}</span></li>)}</ul> : <p className="text-sm text-gray-500 mt-3">No future harvests listed yet.</p>}</div>
    </section>
    <section className="grid lg:grid-cols-2 gap-5">
      <div className="card p-5"><h3 className="font-bold flex gap-2 items-center"><Lightbulb className="w-4 h-4"/> Crop health assistant</h3><p className="text-xs text-gray-500 mt-1">Describe symptoms or attach a leaf photo. Advice requires an OpenAI API key on the backend.</p><form className="mt-3 space-y-3" onSubmit={ask}><textarea className="input" rows="3" value={question} onChange={e=>setQuestion(e.target.value)} placeholder="Describe spots, wilting, pests, or crop stage..."/><label className="flex items-center gap-2 text-sm cursor-pointer"><ImagePlus className="w-4 h-4"/> Add leaf photo<input type="file" accept="image/*" className="text-xs" onChange={e=>setPhoto(e.target.files?.[0] || null)}/></label><button disabled={asking} className="btn-primary">{asking ? 'Checking...' : 'Ask crop assistant'}</button></form>{answer && <p className="mt-3 whitespace-pre-wrap rounded-lg bg-green-50 p-3 text-sm">{answer}</p>}</div>
      <div className="card p-5"><h3 className="font-bold flex gap-2 items-center"><Newspaper className="w-4 h-4"/> Government schemes & mandi news</h3><p className="text-xs text-gray-500 mt-1">Official links; check each portal for current eligibility and dates.</p><div className="mt-3 space-y-3">{schemes.map(s=><a key={s.title} href={s.url} target="_blank" rel="noreferrer" className="block rounded-lg border p-3 hover:bg-gray-50"><b className="text-sm text-primary-700">{s.title}</b><p className="text-xs text-gray-600 mt-1">{s.text}</p></a>)}<a className="text-sm text-primary-700 underline" href="https://agmarknet.gov.in/" target="_blank" rel="noreferrer">AGMARKNET mandi prices and arrivals</a><a className="text-sm text-primary-700 underline" href="https://pib.gov.in/" target="_blank" rel="noreferrer">PIB agriculture news and announcements</a></div></div>
    </section>
  </div>;
}
