import { useEffect, useState } from 'react';

export type Tema = 'dark' | 'light';

const CLAVE_TEMA = 'evaluador.tema';

export function useTema() {
  const [tema, setTema] = useState<Tema>(() => {
    if (typeof window === 'undefined') return 'dark';
    const porUrl = new URLSearchParams(window.location.search).get('tema');
    if (porUrl === 'claro') return 'light';
    if (porUrl === 'oscuro') return 'dark';
    return window.localStorage.getItem(CLAVE_TEMA) === 'light' ? 'light' : 'dark';
  });

  useEffect(() => {
    document.documentElement.dataset.theme = tema;
    window.localStorage.setItem(CLAVE_TEMA, tema);
  }, [tema]);

  return { tema, alternar: () => setTema((actual) => (actual === 'dark' ? 'light' : 'dark')) };
}
