'use client';

import { MiniKitProvider } from '@coinbase/onchainkit/minikit';
import { ReactNode } from 'react';
import { base } from 'viem/chains';

export function MiniKitContextProvider({ children }: { children: ReactNode }) {
  const apiKey = process.env.NEXT_PUBLIC_CDP_CLIENT_API_KEY;
  
  if (!apiKey) {
    console.warn('NEXT_PUBLIC_CDP_CLIENT_API_KEY is not set');
  }
  
  return (
    <MiniKitProvider 
      apiKey={apiKey || ''} 
      chain={base}
    >
      {children}
    </MiniKitProvider>
  );
}