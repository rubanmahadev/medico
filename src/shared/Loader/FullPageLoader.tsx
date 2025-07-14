// components/FullPageLoader.tsx
import { Circles } from 'react-loader-spinner';

const FullPageLoader = () => {
  return (
    <div className="fixed inset-0 z-60 bg-white/60 backdrop-blur-sm flex items-center justify-center">
      <Circles height="60" width="60" color="#0ea5e9" />
    </div>
  );
};

export default FullPageLoader;
