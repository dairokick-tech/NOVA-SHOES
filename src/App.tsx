import Storefront from './Storefront';
import AdminPanel from './AdminPanel';
export default function App(){
  const path=window.location.pathname.replace(/\/+$/,'')||'/';
  return path.endsWith('/admin') ? <AdminPanel/> : <Storefront/>;
}
