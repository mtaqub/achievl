import { Redirect } from 'expo-router';
import React from 'react';

/** Unknown links land on the dashboard rather than a dead end. */
export default function NotFound() {
  return <Redirect href="/" />;
}
