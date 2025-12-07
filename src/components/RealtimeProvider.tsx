'use client';

import { useState, useEffect } from 'react';

interface RealtimeProviderProps {
  children: React.ReactNode;
}

export function RealtimeProvider({ children }: RealtimeProviderProps) {
  return <>{children}</>;
}
