const ICONS = ['✿', '▰', '✦'];
export const DECORATION_ICONS = { flowers: '✿', mushrooms: '♣', crystals: '◆' } as const;
export type DecorationKey = keyof typeof DECORATION_ICONS;

type Refuge = { name: string; short: string; creature: string; description: string };
type Stage = { name: string; short: string; instruction: string; done: string; next: string };
type Content = { refuges: Refuge[]; stages: Stage[]; decorations: Record<DecorationKey, string> };

const es: Content = {
  refuges: [
    {
      name: 'El claro de Luma',
      short: 'El claro',
      creature: 'Luma',
      description: 'Una pequeña exploradora que guarda el sol en su barriga.',
    },
    {
      name: 'El bosque gemelo',
      short: 'bosque gemelo',
      creature: 'Pipo',
      description: 'Le gusta saltar de dos en dos entre las hojas.',
    },
    {
      name: 'La bahía brillante',
      short: 'bahía brillante',
      creature: 'Coral',
      description: 'Colecciona diez conchas antes de volver a casa.',
    },
    {
      name: 'El jardín lunar',
      short: 'jardín lunar',
      creature: 'Mora',
      description: 'Sus flores abren cinco pétalos cuando sale la luna.',
    },
    {
      name: 'Las tres cascadas',
      short: 'tres cascadas',
      creature: 'Nilo',
      description: 'Escucha tres cascadas y se inventa una canción.',
    },
    {
      name: 'La pradera suave',
      short: 'pradera suave',
      creature: 'Trébol',
      description: 'Busca tréboles de cuatro hojas para sus amigos.',
    },
    {
      name: 'La cueva de cristal',
      short: 'cueva de cristal',
      creature: 'Ópalo',
      description: 'Encuentra estrellas de seis puntas dentro de las rocas.',
    },
    {
      name: 'El valle arcoíris',
      short: 'valle arcoíris',
      creature: 'Iris',
      description: 'Pinta los caminos con los siete colores del arcoíris.',
    },
    {
      name: 'El lago secreto',
      short: 'lago secreto',
      creature: 'Otto',
      description: 'Tiene ocho piedritas favoritas. ¡Todas son diferentes!',
    },
    {
      name: 'La cima estrellada',
      short: 'cima estrellada',
      creature: 'Nova',
      description: 'Enciende nueve estrellas para guiar a quienes llegan.',
    },
  ],
  stages: [
    {
      name: 'Siembra el jardín',
      short: 'Semillas',
      instruction: 'Prepara semillas para el refugio.',
      done: '¡El jardín ya tiene sus semillas!',
      next: 'Ahora cruzaremos el río para llevarlas a casa.',
    },
    {
      name: 'Construye el puente',
      short: 'Puente',
      instruction: 'Toca la piedra que completa el puente.',
      done: '¡Ya podemos cruzar el río!',
      next: 'Solo falta encender las luces del refugio.',
    },
    {
      name: 'Enciende el refugio',
      short: 'Luces',
      instruction: 'Escribe el número para encender la luz.',
      done: '¡El refugio está lleno de luz!',
      next: '',
    },
  ],
  decorations: { flowers: 'Flores', mushrooms: 'Setas', crystals: 'Cristales' },
};

const en: Content = {
  refuges: [
    {
      name: "Luma's Clearing",
      short: 'The clearing',
      creature: 'Luma',
      description: 'A little explorer who keeps the sun in her tummy.',
    },
    {
      name: 'The Twin Forest',
      short: 'Twin Forest',
      creature: 'Pipo',
      description: 'Loves hopping between the leaves two by two.',
    },
    {
      name: 'The Shining Bay',
      short: 'Shining Bay',
      creature: 'Coral',
      description: 'Collects ten seashells before heading home.',
    },
    {
      name: 'The Moon Garden',
      short: 'Moon Garden',
      creature: 'Mora',
      description: 'Her flowers open five petals when the moon comes out.',
    },
    {
      name: 'The Three Waterfalls',
      short: 'Three Waterfalls',
      creature: 'Nilo',
      description: 'Listens to three waterfalls and makes up a song.',
    },
    {
      name: 'The Soft Meadow',
      short: 'Soft Meadow',
      creature: 'Clover',
      description: 'Looks for four-leaf clovers for her friends.',
    },
    {
      name: 'The Crystal Cave',
      short: 'Crystal Cave',
      creature: 'Opal',
      description: 'Finds six-pointed stars hidden inside the rocks.',
    },
    {
      name: 'The Rainbow Valley',
      short: 'Rainbow Valley',
      creature: 'Iris',
      description: 'Paints the paths with the seven colours of the rainbow.',
    },
    {
      name: 'The Secret Lake',
      short: 'Secret Lake',
      creature: 'Otto',
      description: 'Has eight favourite pebbles. Every one is different!',
    },
    {
      name: 'The Starry Peak',
      short: 'Starry Peak',
      creature: 'Nova',
      description: 'Lights nine stars to guide everyone who arrives.',
    },
  ],
  stages: [
    {
      name: 'Plant the garden',
      short: 'Seeds',
      instruction: 'Get seeds ready for the refuge.',
      done: 'The garden has its seeds!',
      next: "Now let's cross the river to take them home.",
    },
    {
      name: 'Build the bridge',
      short: 'Bridge',
      instruction: 'Tap the stone that finishes the bridge.',
      done: 'We can cross the river now!',
      next: 'All that is left is to light up the refuge.',
    },
    {
      name: 'Light up the refuge',
      short: 'Lights',
      instruction: 'Type the number to switch on the light.',
      done: 'The refuge is full of light!',
      next: '',
    },
  ],
  decorations: { flowers: 'Flowers', mushrooms: 'Mushrooms', crystals: 'Crystals' },
};

export const CONTENT = { es, en };
export const stageIcon = (index: number) => ICONS[index];
