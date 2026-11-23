/**
 * Frases de la máquina de escribir (habitación de los mensajes).
 * Todas son de Abraxas y NO se usan en ninguna otra parte del sitio.
 * Fuente: Poemario, transcritas y verificadas contra la imagen de la página del visor
 * (public/assets/room-04/books/pages/poemario/p-NNN.webp); se indica también la página impresa.
 */
export interface TypedQuote {
  text: string;
  source: string;
}

export const TYPEWRITER_QUOTES: TypedQuote[] = [
  { text: "Porque la prudencia relajada, en su destemple, es equilibrio sabio entre la pasión del amor y el odio.", source: "Abraxas, Poemario, pág. 106 (visor p. 109)" },
  { text: "¡Oh sin fondo pozo de la ilusión! que te diriges a la felicidad, ¿no encuentras en tu caminar agotador esa siempre alcanzada frustración?", source: "Abraxas, Poemario, pág. 253 (visor p. 235)" },
  { text: "La ley del hombre es la ley de la tierra, sueñe, cante, llore o ría como Zorba el griego sobre las ruinas de su construcción.", source: "Abraxas, Poemario, pág. 205 (visor p. 196)" },
  { text: "Abraxas protagoniza este ideario recreativo y fecundamente árido. No hará mención de nombres porque sólo sonidos son.", source: "Abraxas, Poemario, pág. 9 (visor p. 23)" },
  { text: "Pero ¿. . . estaré soñando? ¿Seré de la humanidad extraviada un soñador perdido?", source: "Abraxas, Poemario, pág. 19 (visor p. 32)" },
  { text: "En este mágico espectro me reflejaba, algunos espiritus nítidos y otros borrosos por la mirada no codificada de la historia, que sólo nos muestra de las realidades, las espumas.", source: "Abraxas, Poemario, pág. 81 (visor p. 88)" },
  { text: "La existencia humana, siendo afortunada, en la infancia logra caminar a gatas, en su pubertad y madurez, la mejor, andará sobre sus dos piernas, que en su vejez, son tres, al tener como apoyo al bastón paciente.", source: "Abraxas, Poemario, pág. 76 (visor p. 83)" },
  { text: "Ojo mundo y hombre! porque el hombre unidad, nunca existió. ¿Existirá?", source: "Abraxas, Poemario, pág. 15 (visor p. 28)" },
];
