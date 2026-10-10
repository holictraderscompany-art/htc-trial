export const metadata = { title: 'Sign in' };
const errors = {
  failed: 'Sign-in did not complete. Try again in the same browser.',
  unavailable: 'Sign-in is unavailable right now. Please try again later.',
  signout: 'You are signed out on this browser. The remote session could not be revoked; it will expire automatically.',
};
export default async function SignInPage({ searchParams }) {
  const parameters = await searchParams;
  const message = typeof parameters.error === 'string' ? errors[parameters.error] : null;
  return <section className="sign-in"><h1>Sign in to HTC</h1><p>Use your Google account for your Trial session.</p>
    {message && <p className="notice" role="alert">{message}</p>}
    <form method="post" action="/auth/start"><button className="button" type="submit">Continue with Google</button></form>
    <p className="muted">Public content is available without an account. When your session expires, sign in again.</p>
    <a href="/content">Browse without signing in</a>
  </section>;
}
