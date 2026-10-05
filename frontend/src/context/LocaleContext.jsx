import { createContext, useContext, useEffect, useMemo, useState } from 'react';

// Shared English interface copy used by the whole rendered app. Product names,
// farmer names, addresses, and other user supplied content are left untouched.
const rows = [
  ['Home','होम','मुख्यपृष्ठ'], ['Marketplace','बाज़ार','बाजारपेठ'], ['Market Prices','मंडी भाव','बाजारभाव'], ['Compare','तुलना करें','तुलना करा'],
  ['Compare Prices','कीमतों की तुलना करें','किमतींची तुलना करा'], ['How It Works','यह कैसे काम करता है','हे कसे कार्य करते'], ['About','हमारे बारे में','आमच्याबद्दल'],
  ['Login','लॉग इन','लॉग इन'], ['Login here','यहाँ लॉग इन करें','येथे लॉग इन करा'], ['Logout','लॉग आउट','लॉग आउट'], ['Register','रजिस्टर करें','नोंदणी करा'],
  ['Dashboard','डैशबोर्ड','डॅशबोर्ड'], ['Profile','प्रोफ़ाइल','प्रोफाइल'], ['Notifications','सूचनाएँ','सूचना'], ['Mark all read','सभी को पढ़ा हुआ मानें','सर्व वाचलेले म्हणून चिन्हांकित करा'],
  ['No notifications yet','अभी कोई सूचना नहीं है','अद्याप सूचना नाहीत'], ['View all','सभी देखें','सर्व पहा'], ['Search','खोजें','शोधा'], ['Filters','फ़िल्टर','फिल्टर'], ['Filter','फ़िल्टर','फिल्टर'],
  ['Reset','रीसेट करें','रीसेट करा'], ['Apply','लागू करें','लागू करा'], ['Save','सहेजें','जतन करा'], ['Cancel','रद्द करें','रद्द करा'], ['Delete','हटाएँ','हटवा'], ['Edit','बदलें','संपादित करा'],
  ['Submit','जमा करें','सबमिट करा'], ['Update','अपडेट करें','अपडेट करा'], ['Back','वापस','मागे'], ['Next','अगला','पुढे'], ['Previous','पिछला','मागील'], ['Close','बंद करें','बंद करा'],
  ['Loading...','लोड हो रहा है...','लोड होत आहे...'], ['Loading products...','उत्पाद लोड हो रहे हैं...','उत्पादने लोड होत आहेत...'], ['No products found','कोई उत्पाद नहीं मिला','उत्पादने आढळली नाहीत'],
  ['Try adjusting your search or filters.','अपनी खोज या फ़िल्टर बदलकर देखें।','तुमचा शोध किंवा फिल्टर बदलून पहा.'], ['Available','उपलब्ध','उपलब्ध'], ['Details','विवरण','तपशील'], ['Add','जोड़ें','जोडा'],
  ['Add to cart','कार्ट में जोड़ें','कार्टमध्ये जोडा'], ['My Cart','मेरा कार्ट','माझे कार्ट'], ['My Orders','मेरे ऑर्डर','माझ्या ऑर्डर'], ['Orders','ऑर्डर','ऑर्डर्स'], ['Order Management','ऑर्डर प्रबंधन','ऑर्डर व्यवस्थापन'],
  ['Track Order','ऑर्डर ट्रैक करें','ऑर्डर ट्रॅक करा'], ['Order History','ऑर्डर इतिहास','ऑर्डर इतिहास'], ['Items','आइटम','वस्तू'], ['Total','कुल','एकूण'], ['Subtotal','उप-योग','उपएकूण'], ['Delivery Fee','डिलीवरी शुल्क','वितरण शुल्क'],
  ['Cash on Delivery','डिलीवरी पर नकद भुगतान','डिलिव्हरीच्या वेळी रोख'], ['Payment Method','भुगतान का तरीका','पेमेंट पद्धत'], ['Delivery Address','डिलीवरी का पता','डिलिव्हरीचा पत्ता'], ['Place Order','ऑर्डर करें','ऑर्डर द्या'],
  ['My Products','मेरे उत्पाद','माझी उत्पादने'], ['Products','उत्पाद','उत्पादने'], ['Add Product','उत्पाद जोड़ें','उत्पादन जोडा'], ['Edit Product','उत्पाद बदलें','उत्पादन संपादित करा'],
  ['Product Name','उत्पाद का नाम','उत्पादनाचे नाव'], ['Category','श्रेणी','श्रेणी'], ['Price','कीमत','किंमत'], ['Quantity','मात्रा','प्रमाण'], ['Location','स्थान','ठिकाण'], ['Description','विवरण','वर्णन'],
  ['Farmer','किसान','शेतकरी'], ['Buyer','खरीदार','खरेदीदार'], ['Delivery Partner','डिलीवरी पार्टनर','डिलिव्हरी भागीदार'], ['Full Name','पूरा नाम','पूर्ण नाव'], ['Email','ईमेल','ईमेल'], ['Phone','फ़ोन','फोन'],
  ['Vehicle Type','वाहन का प्रकार','वाहनाचा प्रकार'], ['Vehicle Number','वाहन नंबर','वाहन क्रमांक'], ['Address / Location','पता / स्थान','पत्ता / ठिकाण'], ['Password','पासवर्ड','पासवर्ड'], ['Confirm Password','पासवर्ड की पुष्टि करें','पासवर्डची पुष्टी करा'],
  ['Create your account','अपना खाता बनाएँ','तुमचे खाते तयार करा'], ['Join the agricultural marketplace','कृषि बाज़ार से जुड़ें','कृषी बाजारपेठेत सामील व्हा'], ['Create Account','खाता बनाएँ','खाते तयार करा'],
  ['Already have an account?','क्या आपका पहले से खाता है?','तुमचे खाते आधीपासून आहे का?'], ['Creating account...','खाता बनाया जा रहा है...','खाते तयार होत आहे...'], ['Welcome back','वापसी पर स्वागत है','पुन्हा स्वागत आहे'],
  ['Login to your AgriConnect account','अपने AgriConnect खाते में लॉग इन करें','तुमच्या AgriConnect खात्यात लॉग इन करा'], ['Email Address','ईमेल पता','ईमेल पत्ता'], ['Forgot password?','पासवर्ड भूल गए?','पासवर्ड विसरलात?'],
  ['Remember me','मुझे याद रखें','मला लक्षात ठेवा'], ['My Favorites','मेरे पसंदीदा','माझे आवडते'], ['Favorite Farmers','पसंदीदा किसान','आवडते शेतकरी'], ['Messages','संदेश','संदेश'], ['Send','भेजें','पाठवा'],
  ['Earnings & Payouts','कमाई और भुगतान','कमाई आणि पेआउट'], ['Earnings','कमाई','कमाई'], ['Buyer Requests','खरीदार के अनुरोध','खरेदीदारांच्या विनंत्या'], ['Farm Insights','खेत की जानकारी','शेतीविषयक माहिती'],
  ['My Deliveries','मेरी डिलीवरी','माझ्या डिलिव्हरी'], ['Users','उपयोगकर्ता','वापरकर्ते'], ['Logistics','लॉजिस्टिक्स','लॉजिस्टिक्स'], ['Reports & Disputes','रिपोर्ट और विवाद','अहवाल आणि विवाद'], ['Audit History','ऑडिट इतिहास','ऑडिट इतिहास'],
  ['Marketplace','बाज़ार','बाजारपेठ'], ['Offers & Weekly Plans','ऑफ़र और साप्ताहिक योजनाएँ','ऑफर आणि साप्ताहिक योजना'], ['Featured Products','चुनिंदा उत्पाद','वैशिष्ट्यीकृत उत्पादने'],
  ['Featured Farmers','चुनिंदा किसान','वैशिष्ट्यीकृत शेतकरी'], ['The seasonal market','मौसमी बाज़ार','हंगामी बाजारपेठ'], ['Direct from growers','सीधे किसानों से','थेट शेतकऱ्यांकडून'],
  ['Find nearby harvests, compare farms, and shop with confidence.','पास की फसलें खोजें, खेतों की तुलना करें और भरोसे के साथ खरीदें।','जवळची पिके शोधा, शेतांची तुलना करा आणि विश्वासाने खरेदी करा.'],
  ['Use my location','मेरी लोकेशन इस्तेमाल करें','माझे स्थान वापरा'], ['List','सूची','यादी'], ['Map','नक्शा','नकाशा'], ['No map coordinates for these listings yet','इन लिस्टिंग के लिए नक्शे की जानकारी उपलब्ध नहीं है','या नोंदींसाठी नकाशावरील स्थान उपलब्ध नाही'],
  ['Find nearby farms','पास के खेत खोजें','जवळची शेते शोधा'], ['Loading nearby farms…','पास के खेत लोड हो रहे हैं…','जवळची शेते लोड होत आहेत…'], ['Try a supported city or use your location to find geocoded farms.','किसी समर्थित शहर का नाम डालें या अपने पास के खेत खोजने के लिए लोकेशन इस्तेमाल करें।','समर्थित शहर निवडा किंवा जवळची शेते शोधण्यासाठी तुमचे स्थान वापरा.'],
  ['Direct from farms','सीधे खेतों से','थेट शेतातून'], ['Transparent pricing','पारदर्शी कीमतें','पारदर्शक किंमती'], ['Tracked delivery','ट्रैक की गई डिलीवरी','ट्रॅक केलेली डिलिव्हरी'], ['Fresh picks directly from our farmers','हमारे किसानों से ताज़ी उपज','आमच्या शेतकऱ्यांकडून ताजा माल'],
  ['How AgriConnect Works','AgriConnect कैसे काम करता है','AgriConnect कसे कार्य करते'], ['For Farmers','किसानों के लिए','शेतकऱ्यांसाठी'], ['For Buyers','खरीदारों के लिए','खरेदीदारांसाठी'], ['Get Started Free','मुफ़्त शुरुआत करें','मोफत सुरुवात करा'],
  ['Explore Marketplace','बाज़ार देखें','बाजारपेठ पहा'], ['Become a Farmer','किसान बनें','शेतकरी बना'], ['Become a Buyer','खरीदार बनें','खरेदीदार बना'], ['Quick Links','त्वरित लिंक','जलद दुवे'], ['Contact','संपर्क','संपर्क'],
  ['Market Prices','मंडी भाव','बाजारभाव'], ['Compare Prices','कीमतों की तुलना करें','किमतींची तुलना करा'], ['No orders found','कोई ऑर्डर नहीं मिला','ऑर्डर आढळले नाहीत'], ['No users found','कोई उपयोगकर्ता नहीं मिला','वापरकर्ता आढळला नाही'],
  ['No reports found','कोई रिपोर्ट नहीं मिली','अहवाल आढळला नाही'], ['No products yet','अभी कोई उत्पाद नहीं है','अद्याप उत्पादने नाहीत'], ['No orders yet','अभी कोई ऑर्डर नहीं है','अद्याप ऑर्डर नाहीत'],
  ['View all products','सभी उत्पाद देखें','सर्व उत्पादने पहा'], ['View All Products','सभी उत्पाद देखें','सर्व उत्पादने पहा'], ['Search products...','उत्पाद खोजें...','उत्पादने शोधा...'], ['Search farmers...','किसानों को खोजें...','शेतकरी शोधा...'],
  ['e.g. Pune','जैसे पुणे','उदा. पुणे'], ['Search order / buyer...','ऑर्डर / खरीदार खोजें...','ऑर्डर / खरेदीदार शोधा...'], ['Page','पृष्ठ','पृष्ठ'], ['Page 1 of 1','पृष्ठ 1 में से 1','पृष्ठ 1 पैकी 1'],
  ['This week’s harvest','इस सप्ताह की फसल','या आठवड्यातील पीक'], ['Seasonal harvests','मौसमी फसलें','हंगामी पिके'], ['Verified growers','सत्यापित किसान','पडताळलेले उत्पादक'], ['Transparent prices','पारदर्शी कीमतें','पारदर्शक किंमती'],
  ['Fresh to your doorstep','ताज़ा उपज आपके घर तक','ताजा माल तुमच्या दारापर्यंत'], ['Support local farms','स्थानीय खेतों का समर्थन करें','स्थानिक शेतांना साथ द्या'], ['No middlemen','कोई बिचौलिया नहीं','मध्यस्थ नाहीत'], ['Organic','जैविक','सेंद्रिय'], ['Pre-order','प्री-ऑर्डर','आगाऊ ऑर्डर'], ['Out of Stock','स्टॉक में नहीं','साठा उपलब्ध नाही'],
  ['Filters','फ़िल्टर','फिल्टर'], ['Sort by','क्रम से लगाएँ','क्रमवारी'], ['Newest','सबसे नया','नवीनतम'], ['Price: Low to High','कीमत: कम से ज़्यादा','किंमत: कमी ते जास्त'], ['Price: High to Low','कीमत: ज़्यादा से कम','किंमत: जास्त ते कमी'],
  ['Minimum price','न्यूनतम कीमत','किमान किंमत'], ['Maximum price','अधिकतम कीमत','कमाल किंमत'], ['All Categories','सभी श्रेणियाँ','सर्व श्रेणी'], ['All','सभी','सर्व'], ['Apply Filters','फ़िल्टर लागू करें','फिल्टर लागू करा'], ['Clear Filters','फ़िल्टर हटाएँ','फिल्टर काढा'],
  ['Track your orders in real time','अपने ऑर्डर को तुरंत ट्रैक करें','तुमचे ऑर्डर रिअल टाइममध्ये ट्रॅक करा'], ['Loading admin dashboard...','एडमिन डैशबोर्ड लोड हो रहा है...','अ‍ॅडमिन डॅशबोर्ड लोड होत आहे...'], ['Platform Overview','प्लेटफ़ॉर्म का अवलोकन','प्लॅटफॉर्मचा आढावा'],
  ['Total Users','कुल उपयोगकर्ता','एकूण वापरकर्ते'], ['Total Products','कुल उत्पाद','एकूण उत्पादने'], ['Total Orders','कुल ऑर्डर','एकूण ऑर्डर्स'], ['Total Sales','कुल बिक्री','एकूण विक्री'], ['Farmers','किसान','शेतकरी'], ['Buyers','खरीदार','खरेदीदार'], ['Delivery Partners','डिलीवरी पार्टनर','डिलिव्हरी भागीदार'],
  ['Create Product','उत्पाद बनाएँ','उत्पादन तयार करा'], ['Update Profile','प्रोफ़ाइल अपडेट करें','प्रोफाइल अपडेट करा'], ['Change Password','पासवर्ड बदलें','पासवर्ड बदला'], ['Save Changes','बदलाव सहेजें','बदल जतन करा'], ['View Details','विवरण देखें','तपशील पहा'], ['Status','स्थिति','स्थिती'], ['Actions','कार्रवाई','कृती'], ['Date','तारीख','दिनांक'],
  ['Name','नाम','नाव'], ['Role','भूमिका','भूमिका'], ['Verified','सत्यापित','पडताळलेले'], ['Pending','लंबित','प्रलंबित'], ['Rejected','अस्वीकृत','नाकारले'], ['Active','सक्रिय','सक्रिय'], ['Inactive','निष्क्रिय','निष्क्रिय'], ['All status','सभी स्थिति','सर्व स्थिती'], ['Cash on Delivery','डिलीवरी पर नकद भुगतान','डिलिव्हरीच्या वेळी रोख'],
  ['Vegetables','सब्ज़ियाँ','भाज्या'], ['Fruits','फल','फळे'], ['Grains','अनाज','धान्य'], ['Pulses','दालें','कडधान्ये'], ['Spices','मसाले','मसाले'], ['Dairy','डेयरी','दुग्धजन्य पदार्थ'],
  ['Good food starts','अच्छे भोजन की शुरुआत','चांगल्या अन्नाची सुरुवात'], ['closer','नज़दीक से','जवळून'], ['to home.','घर से।','घरापासून.'], ['A closer connection to your food','आपके भोजन से एक नज़दीकी रिश्ता','तुमच्या अन्नाशी जवळचे नाते'],
  ['Browse produce','ताज़ी उपज देखें','ताजा माल पहा'], ['Shop produce','उपज खरीदें','माल खरेदी करा'], ['Find fresh produce near you','अपने पास ताज़ी उपज खोजें','तुमच्या जवळचा ताजा माल शोधा'],
  ['Shop seasonal produce directly from the people who grow it. Clear prices, real farms, and delivery you can follow.','मौसमी उपज सीधे उगाने वालों से खरीदें। स्पष्ट कीमतें, असली खेत और ट्रैक की जा सकने वाली डिलीवरी।','हंगामी माल थेट उत्पादकांकडून खरेदी करा. स्पष्ट किंमती, खरी शेते आणि ट्रॅक करता येणारी डिलिव्हरी.'],
  ['Farm to table, without the detour','बिना देरी खेत से आपकी मेज़ तक','वळसा न घेता शेतातून तुमच्या ताटात'], ['Know who grew it. Enjoy what’s in season.','जानें इसे किसने उगाया। मौसम का आनंद लें।','हे कोणी पिकवले ते जाणून घ्या. हंगामाचा आनंद घ्या.'],
  ['Every harvest brings the farm closer.','हर फसल खेत को आपके करीब लाती है।','प्रत्येक पीक शेताला तुमच्या जवळ आणते.'], ['Grown nearby · Delivered with care','पास में उगाया · देखभाल से पहुँचाया','जवळ पिकवले · काळजीपूर्वक पोहोचवले'],
  ['Registered Farmers','पंजीकृत किसान','नोंदणीकृत शेतकरी'], ['Products Listed','सूचीबद्ध उत्पाद','नोंदवलेली उत्पादने'], ['Farmer Earnings','किसानों की कमाई','शेतकऱ्यांची कमाई'], ['Verified farms selected by our team','हमारी टीम द्वारा चुने गए सत्यापित खेत','आमच्या टीमने निवडलेली पडताळलेली शेते'],
  ['Farmers List','किसान सूची बनाते हैं','शेतकरी उत्पादने नोंदवतात'], ['Buyers Browse','खरीदार खोजते हैं','खरेदीदार शोधतात'], ['Order Placed','ऑर्डर दिया गया','ऑर्डर दिला'], ['Fast Delivery','तेज़ डिलीवरी','जलद डिलिव्हरी'],
  ['Sell directly to buyers - no middlemen','बिना बिचौलियों के सीधे खरीदारों को बेचें','मध्यस्थांशिवाय थेट खरेदीदारांना विक्री करा'], ['Get better prices for your produce','अपनी उपज का बेहतर दाम पाएँ','तुमच्या मालाला चांगला भाव मिळवा'], ['Reach buyers across Maharashtra & India','महाराष्ट्र और भारत के खरीदारों तक पहुँचें','महाराष्ट्र आणि भारतातील खरेदीदारांपर्यंत पोहोचा'],
  ['Manage orders and inventory easily','ऑर्डर और स्टॉक आसानी से संभालें','ऑर्डर आणि साठा सहज व्यवस्थापित करा'], ['Real-time notifications for new orders','नए ऑर्डर की तुरंत सूचना पाएँ','नवीन ऑर्डरची त्वरित सूचना मिळवा'], ['Track your sales and earnings','अपनी बिक्री और कमाई देखें','तुमची विक्री आणि कमाई ट्रॅक करा'],
  ['Buy fresh produce directly from farms','खेतों से सीधे ताज़ी उपज खरीदें','शेतातून थेट ताजा माल खरेदी करा'], ['Compare prices across multiple farmers','कई किसानों की कीमतों की तुलना करें','अनेक शेतकऱ्यांच्या किंमतींची तुलना करा'], ['Transparent pricing - no hidden costs','पारदर्शी कीमतें - कोई छिपा खर्च नहीं','पारदर्शक किंमती - कोणतेही छुपे शुल्क नाही'],
  ['Wide variety of categories','कई तरह की श्रेणियाँ','विविध प्रकारच्या श्रेणी'], ['Reliable delivery to your doorstep','आपके घर तक भरोसेमंद डिलीवरी','तुमच्या दारापर्यंत विश्वासार्ह डिलिव्हरी'], ['Agricultural Logistics','कृषि लॉजिस्टिक्स','कृषी लॉजिस्टिक्स'], ['Reliable Logistics, Every Step of the Way','हर कदम पर भरोसेमंद लॉजिस्टिक्स','प्रत्येक टप्प्यावर विश्वासार्ह लॉजिस्टिक्स'],
  ['Ready for Pickup','पिकअप के लिए तैयार','पिकअपसाठी तयार'], ['Picked Up & In Transit','पिकअप हुआ और रास्ते में','पिकअप झाले आणि मार्गावर'], ['Delivered Safely','सुरक्षित रूप से पहुँचाया गया','सुरक्षितपणे पोहोचवले'], ['Grow with us','हमारे साथ आगे बढ़ें','आमच्यासोबत प्रगती करा'], ['Good things grow closer.','अच्छी चीज़ें पास में उगती हैं।','चांगल्या गोष्टी जवळच वाढतात.'],
  ['Loading orders...','ऑर्डर लोड हो रहे हैं...','ऑर्डर्स लोड होत आहेत...'], ['Loading profile...','प्रोफ़ाइल लोड हो रही है...','प्रोफाइल लोड होत आहे...'], ['Assign Delivery Partner','डिलीवरी पार्टनर नियुक्त करें','डिलिव्हरी भागीदार नियुक्त करा'], ['Select Delivery Partner','डिलीवरी पार्टनर चुनें','डिलिव्हरी भागीदार निवडा'], ['Export CSV','CSV एक्सपोर्ट करें','CSV निर्यात करा'],
  ['Farmer verification','किसान सत्यापन','शेतकरी पडताळणी'], ['Verify your farm','अपने खेत का सत्यापन करें','तुमच्या शेताची पडताळणी करा'], ['Submit for review','समीक्षा के लिए भेजें','पुनरावलोकनासाठी पाठवा'], ['KYC Status','KYC स्थिति','KYC स्थिती'], ['Pending verification','सत्यापन लंबित','पडताळणी प्रलंबित'],
  ['Weekly produce plan','साप्ताहिक उपज योजना','साप्ताहिक शेतमाल योजना'], ['Start weekly plan','साप्ताहिक योजना शुरू करें','साप्ताहिक योजना सुरू करा'], ['Send offer','ऑफ़र भेजें','ऑफर पाठवा'], ['Accept','स्वीकार करें','स्वीकारा'], ['Counter offer','जवाबी ऑफ़र','प्रतिऑफर'], ['Reject offer','ऑफ़र अस्वीकार करें','ऑफर नाकारा'],
  ['Generate a new OTP','नया OTP बनाएं','नवीन OTP तयार करा'], ['Generating…','बनाया जा रहा है…','तयार होत आहे…'], ['Your current delivery OTP is in the notifications bell. Share it only with the assigned courier when your order arrives. A new code replaces the old one.','आपका डिलीवरी OTP सूचनाओं में है। इसे केवल ऑर्डर आने पर नियुक्त कूरियर के साथ साझा करें। नया कोड पुराने को बदल देगा।','तुमचा डिलिव्हरी OTP सूचनांमध्ये आहे. ऑर्डर आल्यावर तो फक्त नियुक्त कुरिअरला सांगा. नवीन कोड जुना कोड बदलेल.'],
  ['Live Route','लाइव मार्ग','थेट मार्ग'], ['Pickup','पिकअप','पिकअप'], ['Proof of Delivery','डिलीवरी का प्रमाण','डिलिव्हरीचा पुरावा'], ['Confirm delivery','डिलीवरी की पुष्टि करें','डिलिव्हरीची पुष्टी करा'], ['Enter delivery OTP','डिलीवरी OTP दर्ज करें','डिलिव्हरी OTP टाका'],
  ['Rating','रेटिंग','रेटिंग'], ['Reviews','समीक्षाएँ','पुनरावलोकने'], ['Write a review','समीक्षा लिखें','पुनरावलोकन लिहा'], ['Submit Review','समीक्षा जमा करें','पुनरावलोकन सबमिट करा'],
  ['Government Schemes','सरकारी योजनाएँ','सरकारी योजना'], ['Mandi News','मंडी समाचार','बाजार समितीच्या बातम्या'], ['No map coordinates for these listings yet','इन लिस्टिंग के लिए नक्शे की जानकारी उपलब्ध नहीं है','या नोंदींसाठी नकाशावरील स्थान उपलब्ध नाही'],
  ['A simple, transparent process connecting farmers, buyers and delivery partners.','किसानों, खरीदारों और डिलीवरी पार्टनर को जोड़ने वाली सरल और पारदर्शी प्रक्रिया।','शेतकरी, खरेदीदार आणि डिलिव्हरी भागीदारांना जोडणारी सोपी आणि पारदर्शक प्रक्रिया.'],
  ['Fresh, local, in season','ताज़ा, स्थानीय और मौसमी','ताजा, स्थानिक आणि हंगामी'], ['View all products','सभी उत्पाद देखें','सर्व उत्पादने पहा'], ['View all orders','सभी ऑर्डर देखें','सर्व ऑर्डर्स पहा'],
  ['Orders Over Time (14 days)','समय के साथ ऑर्डर (14 दिन)','कालावधीनुसार ऑर्डर्स (14 दिवस)'], ['Sales Over Time (14 days)','समय के साथ बिक्री (14 दिन)','कालावधीनुसार विक्री (14 दिवस)'],
  ['Products by Category','श्रेणी के अनुसार उत्पाद','श्रेणीनुसार उत्पादने'], ['User Distribution','उपयोगकर्ता वितरण','वापरकर्ता वितरण'], ['Order Status Distribution','ऑर्डर की स्थिति का वितरण','ऑर्डर स्थिती वितरण'],
  ['Total Sales','कुल बिक्री','एकूण विक्री'], ['Farmers','किसान','शेतकरी'], ['Buyers','खरीदार','खरेदीदार'], ['Delivery Partners','डिलीवरी पार्टनर','डिलिव्हरी भागीदार'], ['Completed Deliveries','पूरी हुई डिलीवरी','पूर्ण झालेल्या डिलिव्हरी'],
  ['All Users','सभी उपयोगकर्ता','सर्व वापरकर्ते'], ['Search users...','उपयोगकर्ता खोजें...','वापरकर्ते शोधा...'], ['Search products...','उत्पाद खोजें...','उत्पादने शोधा...'], ['Search orders...','ऑर्डर खोजें...','ऑर्डर्स शोधा...'],
  ['Order Details','ऑर्डर का विवरण','ऑर्डर तपशील'], ['Buyer Details','खरीदार का विवरण','खरेदीदाराचा तपशील'], ['Farmer Details','किसान का विवरण','शेतकऱ्याचा तपशील'], ['Delivery Details','डिलीवरी का विवरण','डिलिव्हरी तपशील'],
  ['Order Number','ऑर्डर नंबर','ऑर्डर क्रमांक'], ['Payment Status','भुगतान स्थिति','पेमेंट स्थिती'], ['Order Status','ऑर्डर की स्थिति','ऑर्डर स्थिती'], ['Order placed successfully','ऑर्डर सफलतापूर्वक दिया गया','ऑर्डर यशस्वीरीत्या दिला'],
  ['Pending','लंबित','प्रलंबित'], ['Accepted','स्वीकृत','स्वीकारले'], ['Processing','प्रक्रिया में','प्रक्रियेत'], ['Ready for Pickup','पिकअप के लिए तैयार','पिकअपसाठी तयार'], ['Picked Up','पिकअप किया गया','पिकअप झाले'], ['In Transit','रास्ते में','मार्गावर'], ['Delivered','पहुँचा दिया गया','पोहोचवले'], ['Cancelled','रद्द','रद्द'],
  ['Farmer Dashboard','किसान डैशबोर्ड','शेतकरी डॅशबोर्ड'], ['Buyer Dashboard','खरीदार डैशबोर्ड','खरेदीदार डॅशबोर्ड'], ['Admin Dashboard','एडमिन डैशबोर्ड','अ‍ॅडमिन डॅशबोर्ड'], ['Delivery Partner Dashboard','डिलीवरी पार्टनर डैशबोर्ड','डिलिव्हरी भागीदार डॅशबोर्ड'],
  ['Farm Insights','खेत की जानकारी','शेतीविषयक माहिती'], ['Buyer Requests','खरीदार के अनुरोध','खरेदीदारांच्या विनंत्या'], ['Earnings & Payouts','कमाई और भुगतान','कमाई आणि पेआउट'], ['My Deliveries','मेरी डिलीवरी','माझ्या डिलिव्हरी'], ['Reports & Disputes','रिपोर्ट और विवाद','अहवाल आणि विवाद'], ['Audit History','ऑडिट इतिहास','ऑडिट इतिहास'],
  ['No notifications yet','अभी कोई सूचना नहीं है','अद्याप सूचना नाहीत'], ['Mark all read','सभी को पढ़ा हुआ मानें','सर्व वाचलेले म्हणून चिन्हांकित करा'], ['No messages yet','अभी कोई संदेश नहीं है','अद्याप संदेश नाहीत'], ['Type a message...','संदेश लिखें...','संदेश लिहा...'],
  ['Enter your email','अपना ईमेल दर्ज करें','तुमचा ईमेल भरा'], ['Enter your password','अपना पासवर्ड दर्ज करें','तुमचा पासवर्ड भरा'], ['Confirm your password','पासवर्ड की पुष्टि करें','पासवर्डची पुष्टी करा'], ['Search by name or location','नाम या स्थान से खोजें','नाव किंवा ठिकाणानुसार शोधा'],
  ['Location permission was not granted. You can still search by city.','लोकेशन की अनुमति नहीं मिली। आप शहर से खोज सकते हैं।','स्थानाची परवानगी दिली नाही. तुम्ही शहरानुसार शोधू शकता.'],
];

const translations = {
  hi: Object.fromEntries(rows.map(([english, hindi]) => [english, hindi])),
  mr: Object.fromEntries(rows.map(([english, , marathi]) => [english, marathi])),
};
const sourceText = new WeakMap();
const translatedText = new WeakMap();
const sourceAttributes = new WeakMap();
const translatedAttributes = new WeakMap();

const translate = (english, locale) => {
  const dictionary = translations[locale];
  if (!dictionary) return english;
  if (dictionary[english]) return dictionary[english];
  const pageMatch = english.match(/^Page (\d+) of (\d+)$/);
  if (pageMatch) return locale === 'hi' ? `पृष्ठ ${pageMatch[1]} में से ${pageMatch[2]}` : `पृष्ठ ${pageMatch[1]} पैकी ${pageMatch[2]}`;
  const listingMatch = english.match(/^(\d+) listings$/);
  if (listingMatch) return locale === 'hi' ? `${listingMatch[1]} लिस्टिंग` : `${listingMatch[1]} नोंदी`;
  const distanceMatch = english.match(/^([\d.]+) km away$/);
  if (distanceMatch) return locale === 'hi' ? `${distanceMatch[1]} किमी दूर` : `${distanceMatch[1]} किमी अंतरावर`;
  return english;
};

const skipText = (node) => node.parentElement?.closest('script, style, code, pre, textarea, svg');

const localizeNode = (node, locale) => {
  if (node.nodeType !== Node.TEXT_NODE || skipText(node)) return;
  const current = node.nodeValue;
  const last = translatedText.get(node);
  const source = current === last ? sourceText.get(node) : current;
  if (source == null) return;
  const base = source.trim();
  if (!base) return;
  sourceText.set(node, source);
  const leading = source.match(/^\s*/)?.[0] || '';
  const trailing = source.match(/\s*$/)?.[0] || '';
  const localized = translate(base, locale);
  const output = `${leading}${localized}${trailing}`;
  if (localized !== base) translatedText.set(node, output);
  else translatedText.delete(node);
  if (current !== output) node.nodeValue = output;
};

const localizeAttribute = (element, name, locale) => {
  const current = element.getAttribute(name);
  if (current == null) return;
  let sources = sourceAttributes.get(element);
  let localizedValues = translatedAttributes.get(element);
  if (!sources) { sources = new Map(); sourceAttributes.set(element, sources); }
  if (!localizedValues) { localizedValues = new Map(); translatedAttributes.set(element, localizedValues); }
  const source = current === localizedValues.get(name) ? sources.get(name) : current;
  if (source == null) return;
  sources.set(name, source);
  const localized = translate(source, locale);
  if (localized !== source) localizedValues.set(name, localized);
  else localizedValues.delete(name);
  if (current !== localized) element.setAttribute(name, localized);
};

const localizeTree = (root, locale) => {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) localizeNode(node, locale);
  root.querySelectorAll('[placeholder], [title], [aria-label]').forEach((element) => {
    ['placeholder', 'title', 'aria-label'].forEach((name) => localizeAttribute(element, name, locale));
  });
};

const LocaleContext = createContext(null);

export const LocaleProvider = ({ children }) => {
  const [locale, setLocaleState] = useState(() => localStorage.getItem('agriconnect_locale') || 'en');
  const setLocale = (next) => {
    const value = ['en', 'hi', 'mr'].includes(next) ? next : 'en';
    localStorage.setItem('agriconnect_locale', value);
    setLocaleState(value);
  };

  useEffect(() => {
    document.documentElement.lang = locale;
    const root = document.querySelector('.futuristic-ui');
    if (!root) return undefined;
    localizeTree(root, locale);
    const observer = new MutationObserver((changes) => {
      changes.forEach((change) => {
        if (change.type === 'characterData') localizeNode(change.target, locale);
        else if (change.type === 'attributes') localizeAttribute(change.target, change.attributeName, locale);
        else change.addedNodes.forEach((added) => {
          if (added.nodeType === Node.TEXT_NODE) localizeNode(added, locale);
          else if (added.nodeType === Node.ELEMENT_NODE) localizeTree(added, locale);
        });
      });
    });
    observer.observe(root, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['placeholder', 'title', 'aria-label'] });
    return () => observer.disconnect();
  }, [locale]);

  const value = useMemo(() => ({ locale, setLocale, t: (text) => translate(text, locale) }), [locale]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
};

export const useLocale = () => useContext(LocaleContext) || { locale: 'en', setLocale: () => {}, t: (text) => text };
