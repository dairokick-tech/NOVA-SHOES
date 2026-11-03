import Storefront from './Storefront';
import AdminPanel from './AdminPanel';
import PlansPage from './PlansPage';

export default function App(){
  const path=window.location.pathname.replace(/\/+$/,'')||'/';
  if(path.endsWith('/admin')) return <AdminPanel/>;
  if(path.endsWith('/planes')) return <PlansPage/>;
  return <Storefront/>;
}
