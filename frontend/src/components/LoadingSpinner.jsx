/**
 * LoadingSpinner - a simple animated spinner with an optional label.
 */
const LoadingSpinner = ({ label = 'Loading...', fullScreen = false, size = 'md' }) => {
  const sizes = { sm: 'w-5 h-5', md: 'w-8 h-8', lg: 'w-12 h-12' };

  const spinner = (
    <div className="flex flex-col items-center justify-center gap-3">
      <div
        className={`${sizes[size]} border-4 border-primary-100 border-t-primary-600 rounded-full animate-spin`}
      />
      {label && <p className="text-sm text-gray-500">{label}</p>}
    </div>
  );

  if (fullScreen) {
    return <div className="min-h-[60vh] flex items-center justify-center">{spinner}</div>;
  }
  return spinner;
};

export default LoadingSpinner;
