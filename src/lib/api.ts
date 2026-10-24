import { auth } from './firebase';

export async function dreamRequest(url: string, body: unknown) {
  const user = auth.currentUser;
  if (!user) throw new Error('Please sign in again.');
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await user.getIdToken()}` },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error('Request failed. Please try again later.');
  return response.json();
}
