import { PackageOpen } from 'lucide-react';

/**
 * EmptyState - shown when a list has no items.
 */
const EmptyState = ({ icon: Icon = PackageOpen, title = 'Nothing here yet', message, action }) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="p-4 rounded-full bg-gray-100 mb-4">
        <Icon className="w-10 h-10 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
      {message && <p className="mt-1 text-sm text-gray-500 max-w-sm">{message}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
};

export default EmptyState;
