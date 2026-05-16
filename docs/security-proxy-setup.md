# Supabase Edge Function: Groq API Proxy

To fully secure your Groq API key from being exposed in the React Native bundle, we have created an Edge Function located at `supabase/functions/groq-proxy/index.ts`.

## Deployment Steps

Because the deployment requires Supabase authentication from your CLI, please execute the following steps locally in your terminal:

1. **Login to Supabase CLI** (if you haven't already):
   ```bash
   npx supabase login
   ```
2. **Set your Groq API key as a Supabase Secret**:
   ```bash
   npx supabase secrets set GROQ_API_KEY=your_actual_groq_api_key --project-ref your_project_ref
   ```
3. **Deploy the Edge Function**:
   ```bash
   npx supabase functions deploy groq-proxy --project-ref your_project_ref
   ```

## Activating the Proxy in the App

Once the function is deployed and live, you can switch your app to use it instead of the direct client-side SDK.

1. Open `services/groq.ts`.
2. Replace the `fetchGroq` function with the following proxy fetcher:

```typescript
async function fetchGroq(payload: any) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('User is not authenticated. Cannot access AI services.');
  }

  const response = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/groq-proxy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Edge Function Error: ${response.status} ${errorText}`);
  }

  return await response.json();
}
```

3. You can safely remove the `openai` SDK import and the `EXPO_PUBLIC_GROQ_API_KEY` from your `.env` file since all requests will now be securely signed by your Edge Function on the server.
