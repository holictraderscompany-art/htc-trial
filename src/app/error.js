'use client';
import PublicShell from '../components/public-shell.js';
import PublicError from '../components/public-error.js';

export default function RootError({ reset }) {
  return <PublicShell><PublicError reset={reset} /></PublicShell>;
}
