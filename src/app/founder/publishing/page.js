import {redirect} from 'next/navigation';
import {getFounderAccess} from '../access.js';
import Workspace from '../../../components/founder-operation-workspace.js';
export const dynamic='force-dynamic';
export default async function Page(){const {state}=await getFounderAccess();if(state==='anonymous')redirect('/sign-in');if(state!=='founder')return null;return <Workspace kind="publishing"/>;}
