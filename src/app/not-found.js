import { PageState } from '../components/content-views.js';
import PublicShell from '../components/public-shell.js';
export default function NotFound() {
  return <PublicShell><PageState title="Content not found">This page is unavailable. Browse the currently released content instead.</PageState></PublicShell>;
}
