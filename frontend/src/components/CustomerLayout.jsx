import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';

const CustomerLayout = () => {
  return (
    <div className="app">
      <Navbar />
      <main>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default CustomerLayout;
