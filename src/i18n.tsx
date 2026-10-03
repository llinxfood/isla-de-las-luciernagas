import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { CONTENT } from './content';

export type Lang = 'es' | 'en';
// Kept apart from the save file so choosing a language never touches the progress schema.
const LANGUAGE_KEY = 'luciernagas.language';

const es = {
  playTimeTitle: 'Tiempo para jugar',
  playTimeDescription:
    'El límite inicial es de 20 minutos al día. Solo cuenta el tiempo en los retos y al elegir el premio. Ajustes, descansos y pestañas ocultas no cuentan. El límite se renueva al empezar un nuevo día.',
  dailyLimit: 'Activar límite diario',
  minutesPerDay: 'Minutos al día (5–120)',
  newParentPin: 'Crea un PIN de acompañante (4 cifras)',
  confirmParentPin: 'Repite el PIN',
  parentPin: 'PIN de acompañante',
  unlockAdults: 'Abrir ajustes de acompañante',
  pinReminder:
    'Guarda el PIN: lo necesitarás para cambiar el límite o recuperar copias. Este control pertenece al juego; borrar sus datos o usar otra cuenta puede evitarlo.',
  pinWrong: 'El PIN no coincide. Vuelve a intentarlo.',
  pinUnavailable:
    'No se pudo guardar o comprobar el PIN. Reintenta desde una conexión HTTPS o localhost.',
  pinMismatch: 'Escribe el mismo PIN de cuatro cifras en ambos campos.',
  limitInvalid: 'Elige un número entero entre 5 y 120 minutos.',
  playedToday: (minutes: number) => `Tiempo usado hoy: ${minutes} min.`,
  saveTimeLimit: 'Guardar límite',
  limitSaved: 'Límite guardado. El tiempo ya utilizado hoy se conserva.',
  timeEnding: 'Queda un minuto. Pronto descansaremos.',
  islandResting: 'La isla descansa',
  restUntilTomorrow: '¡Buen trabajo! Mañana seguimos descubriendo.',
  adventureKept: 'Tu aventura queda guardada aquí.',
  adultTimeAccess: 'Ajustes de acompañante',

  title: 'La isla de las luciérnagas',
  switchTo: 'EN',
  switchLabel: 'Switch to English',
  skip: 'Saltar al contenido',
  goHome: 'Ir a mi isla',
  brandTop: 'la isla de las',
  brandBottom: 'luciérnagas',
  mainNav: 'Navegación principal',
  myIsland: 'Mi isla',
  myFriends: 'Mis amigos',
  settings: 'Ajustes',
  closeWarning: 'Cerrar aviso',
  noStorage:
    'No se puede guardar en este navegador. Puedes jugar mientras esta pestaña siga abierta.',
  saveFailed:
    'Puedes seguir jugando, pero no podemos guardar. Descarga una copia desde Ajustes → Para acompañantes antes de cerrar.',
  eyebrowHero: 'UNA PEQUEÑA GRAN AVENTURA',
  heroTitle: 'Un poquito de magia.',
  heroTitleEm: 'Un mundo por descubrir.',
  heroText1: 'Multiplica, enciende luces y encuentra',
  heroText2: ' nuevos amigos. Tu isla te espera.',
  lumaHello: '¡Hola! Soy Luma.',
  lumaHelloName: (name: string) => `¡Hola, ${name}! Soy Luma.`,
  askName: '¿Cómo te llamas?',
  wellDone: (name: string) => `¡BIEN HECHO, ${name.toUpperCase()}!`,
  nameLabel: 'Tu nombre',
  nameHint: 'Puede ser un apodo',
  accountTitle: 'Tu cuenta',
  closeInvite: 'Cerrar invitación',
  lumaContinue: '¿Seguimos nuestra aventura?',
  lumaStart: '¿Me ayudas a iluminar la isla?',
  ctaContinue: 'Continuar mi aventura',
  ctaReplay: 'Volver a explorar',
  ctaStart: '¡Vamos a explorar!',
  sessionNote: '3 pequeños tramos · a tu ritmo ·',
  savedCloud: 'con copia en tu cuenta',
  savedHere: 'se guarda aquí',
  inProgress: (table: number) => `Aventura en curso: tabla del ${table}`,
  islandWaking: 'TU ISLA ESTÁ DESPERTANDO',
  mapCaption: 'Cada luz cuenta. Cada aventura también.',
  mapEyebrow: 'EL MAPA DE TU AVENTURA',
  mapTitle: 'Diez refugios. Muchos descubrimientos.',
  refugeCount: (n: number) => `${n} de 10 refugios`,
  refugeLabel: (name: string, table: number, state: 'done' | 'open' | 'locked') =>
    `${name}, tabla del ${table}, ${{ done: 'descubierto', open: 'disponible', locked: 'por descubrir' }[state]}`,
  revisit: 'UN LUGAR AL QUE VOLVER',
  nextDiscovery: 'TU PRÓXIMO DESCUBRIMIENTO',
  tableCaps: (table: number) => `TABLA DEL ${table}`,
  waitsForYou: (creature: string) => `${creature} te espera para seguir practicando.`,
  discover: (creature: string) => `Prepara el jardín, cruza el río y descubre a ${creature}.`,
  continueGame: 'Continuar partida',
  explore: 'Explorar',
  footerCalm: 'Sin prisas. Con muchas ganas.',
  footerCloud: 'Tu aventura viaja contigo.',
  footerLocal: 'Tu aventura se guarda en este dispositivo.',
  collectionEyebrow: 'LOS HABITANTES DE TU ISLA',
  collectionTitle: 'Una pandilla con mucha luz.',
  collectionText: 'Visita a tus amigos y descubre sus pequeñas historias.',
  whoLivesHere: '¿Quién vivirá aquí?',
  table: (table: number) => `Tabla del ${table}`,
  inRefuge: (decoration: string) => `${decoration} en su refugio · Toca para visitar`,
  firstFriend: 'Descubrir a mi primer amigo',
  backToIsland: '← Volver a mi isla',
  lights: (n: number) => `${n} luces`,
  breakEyebrow: '8 PASOS MÁS EN TU AVENTURA',
  stretch: 'Estira los brazos, respira… ¡Lo estás haciendo genial!',
  nextLeg: 'Vamos al siguiente tramo',
  saveAndExit: 'Seguiré otro día · Guardar y salir',
  rewardEyebrow: '¡UN REFUGIO LLENO DE VIDA!',
  hasHome: (creature: string) => `${creature} tiene un hogar.`,
  litLights: (n: number) => `Has encendido ${n} luces. Elige algo bonito para su refugio.`,
  chosen: '✓ Elegido',
  decorate: 'Decorar y conocer a mi amigo',
  restTime: '¡Buen momento para descansar! La isla te esperará.',
  settingsTitle: 'Como a ti te gusta',
  closeSettings: 'Cerrar ajustes',
  sound: 'Sonidos suaves',
  soundHint: 'Al encender una luz',
  motion: 'Animaciones',
  motionHint: 'Un poco de movimiento',
  forAdults: 'Para acompañantes',
  privacyCloud:
    'Tu acceso y tu partida se guardan en Firebase para continuar en otros dispositivos. Sin publicidad ni analítica.',
  privacyLocal:
    'El progreso se guarda en este navegador. Borrar sus datos también borra esta copia. Sin publicidad ni analítica.',
  done: 'Listo',
  adultSummary: (missions: number, lights: number) =>
    `${missions} expediciones completadas · ${lights} luces. Las tablas se abren al completar una expedición, sin exigir velocidad.`,
  adultMastered:
    'Operaciones afianzadas: respuestas independientes en repasos separados. Las ayudas no restan recompensas.',
  adultSupport: 'Conviene acompañar:',
  adultNoErrors: 'Aún no hay operaciones que destaquen por errores.',
  adultSession:
    'Una sesión tiene 24 retos y dos descansos; puede durar unos 5–10 minutos, según el ritmo. Se puede interrumpir en cualquier momento. El tiempo en segundo plano no cuenta.',
  // Challenge
  seeds: (n: number): string => (n === 1 ? 'semilla' : 'semillas'),

  tapPlots: (b: number) => `Toca cada parcela: planta ${b} ${b === 1 ? 'semilla' : 'semillas'}.`,
  plotLabel: (i: number, planted: boolean, b: number) =>
    `Parcela ${i}, ${planted ? `${b} semillas` : 'plantar'}`,
  groupsOf: (n: number, b: number) => `${n} ${n === 1 ? 'grupo' : 'grupos'} de ${b}`,
  seedsWord: 'semillas',
  correct: '¡Lo has conseguido! Una luz más para tu refugio.',
  wrong: 'Todavía no. Vamos a verlo con semillas. Puedes probar otra vez.',
  challengeLabel: 'Reto de la expedición',
  piecesDone: (n: number) => `${n} de 8 piezas completadas`,
  challengeOf: (n: number) => `RETO ${n} DE 8`,
  howManyLights: '¿Cuántas luces en total?',
  yourAnswer: 'Tu respuesta',
  lightUp: 'Encender ✦',
  answerLabel: (n: number) => `Responder ${n}`,
  plantFirst: 'Primero planta todas las parcelas. Después, elige el total.',
  hideSeeds: 'Ocultar semillas',
  showSeeds: '✿ Lo vemos con semillas',
  discoverRefuge: 'Descubrir mi refugio',
  legDone: '¡Tramo completado!',
  keepExploring: 'Seguir explorando',
  howItWorks: '¿Quieres descubrir cómo funciona?',
  plantGroups: 'Planta grupos de semillas',
  // Backup panel
  backupOpenError: 'No se ha podido abrir la copia.',
  noOriginal: 'No encontramos la partida original en este navegador.',
  downloadRequested:
    'Descarga solicitada. Conserva el archivo fuera del navegador para poder recuperar la partida.',
  tooBig: 'La copia es demasiado grande. El límite es 1 MB.',
  noPrevious: 'Todavía no hay una copia automática anterior.',
  noRestoreYet: 'Todavía no se ha restaurado ninguna partida en este navegador.',
  downloadBeforeRestoreDone: 'Descarga solicitada de la partida anterior a la última restauración.',
  restoreFailed: 'No se pudo guardar la restauración. La partida actual no se ha cambiado.',
  restored: 'Partida restaurada. Puedes cerrar Ajustes y continuar tu aventura.',
  recoverFailed: 'No se pudo guardar la recuperación. La partida actual no se ha cambiado.',
  recovered: 'Luma, Pipo, Coral y Mora están disponibles. Puedes cerrar Ajustes.',
  backupTitle: 'Copia de tu aventura',
  backupIntro:
    'Las actualizaciones conservan la partida de este navegador. Guarda también un archivo para recuperarla si cambias de dispositivo o borras sus datos.',
  downloadOriginal: 'Descargar partida original',
  downloadCopy: 'Descargar copia',
  openCopy: 'Abrir una copia',
  backupFile: 'Archivo de copia de seguridad',
  recoverPrevious: 'Recuperar una partida anterior',
  autoCopiesNote:
    'Las copias automáticas viven en este navegador. También se borran si eliminas sus datos.',
  viewPrevious: 'Ver copia automática anterior',
  downloadBeforeRestore: 'Descargar partida previa a la restauración',
  recoverFour: 'Recuperar cuatro amigos sin copia',
  recoverFourText:
    'Desbloquea a Luma, Pipo, Coral y Mora en este dispositivo. Conserva los demás amigos, las operaciones practicadas y la aventura en curso. No añade aciertos ni luces. Guardaremos una copia de la partida actual antes de cambiarla.',
  recoverOriginalFirst: 'Primero recupera la partida original con una copia compatible.',
  haveFour: 'Ya tienes los cuatro amigos',
  recoverFourButton: 'Recuperar los cuatro amigos',
  reviewCopy: 'Revisa la copia antes de restaurar',
  copySummary: (missions: number, refuges: number, lights: number) =>
    `${missions} expediciones · ${refuges} refugios · ${lights} luces`,
  copyInProgress: (table: number, index: number) =>
    `Aventura en curso: tabla del ${table}, reto ${index} de 24.`,
  copyReplaces:
    'Esta copia sustituirá la partida de este navegador. Guardaremos la actual antes de cambiarla.',
  restoreThis: 'Restaurar esta copia',
  cancel: 'Cancelar',
  readingCopy: 'Leyendo copia…',
  // Accounts
  takeIsland: '¿Quieres llevar tu isla a otro dispositivo?',
  signIn: 'Entrar o crear cuenta',
  searching: 'Buscando tu isla…',
  authCheckFailed: 'No se pudo comprobar la cuenta. Recarga para reintentar.',
  authWeak: 'Elige una contraseña más larga y segura.',
  authInUse: 'Este correo ya tiene una cuenta. Pulsa Entrar o recupera la contraseña.',
  authEmail: 'Revisa el correo electrónico.',
  authCredential: 'Revisa el correo y la contraseña.',
  authDisabled: 'Las cuentas todavía no están activadas. Puedes seguir jugando sin cuenta.',
  authTooMany: 'Ha habido muchos intentos. Espera un poco antes de volver a probar.',
  authNetwork: 'No se ha podido conectar. Revisa la conexión y vuelve a intentarlo.',
  resetSent:
    'Si existe una cuenta con ese correo, recibirás las instrucciones para recuperar el acceso.',
  createTitle: 'Crea tu cuenta de la isla',
  loginTitle: 'Vuelve a tu isla',
  closeLogin: 'Cerrar acceso',
  oneAccount: 'Una cuenta guarda una aventura. Usa el mismo acceso en todos tus dispositivos.',
  emailLabel: 'Correo para recuperar el acceso',
  passwordLabel: 'Contraseña',
  createNotice:
    'Al crear la cuenta, el correo y la partida se guardarán en Firebase para sincronizarlos. No pedimos nombre real ni edad. Sin anuncios ni analítica.',
  connecting: 'Conectando…',
  createButton: 'Crear mi cuenta',
  loginButton: 'Entrar',
  haveAccount: 'Ya tengo cuenta',
  createAccount: 'Crear una cuenta',
  forgot: 'He olvidado mi contraseña',
  localOpenFailed: 'No se puede abrir la copia local de esta cuenta. Sus datos se han conservado.',
  backNoAccount: 'Volver sin cuenta',
  choiceFailed: 'No se pudo guardar la elección. Las dos partidas siguen conservadas.',
  prepareFailed:
    'No se pudo preparar la partida. Descarga primero una copia desde el modo sin cuenta.',
  syncNow: 'Sincronizar ahora',
  signOut: 'Cerrar sesión',
  travelsTitle: 'Tu isla viaja contigo',
  bothKept:
    'Se han conservado las dos versiones. La elegida será la que continúe en tus dispositivos.',
  keepLocal: (n: number) => `Continuar la de este dispositivo (${n} amigos)`,
  keepRemote: (n: number) => `Continuar la de la nube (${n} amigos)`,
  noSaveYet: 'Esta cuenta todavía no tiene partida. Puedes llevarte la que ya tienes aquí.',
  bringSave: 'Llevar mi partida a esta cuenta',
  newIsland: 'Empezar una isla nueva',
  retry: 'Reintentar',
};

type Strings = typeof es;
/** Keys of plain-text entries, so components can store a message and translate it on render. */
export type TextKey = {
  [K in keyof Strings]: Strings[K] extends string ? K : never;
}[keyof Strings];

const en: Strings = {
  playTimeTitle: 'Time to play',
  playTimeDescription:
    'The initial limit is 20 minutes per day. Only challenges and choosing a reward count. Settings, rest screens and hidden tabs do not count. The allowance renews at the start of a new day.',
  dailyLimit: 'Enable daily limit',
  minutesPerDay: 'Minutes per day (5–120)',
  newParentPin: 'Create a grown-up PIN (4 digits)',
  confirmParentPin: 'Repeat the PIN',
  parentPin: 'Grown-up PIN',
  unlockAdults: 'Open grown-up settings',
  pinReminder:
    'Keep the PIN: you will need it to change the limit or restore copies. This is an in-game control; clearing its data or using another account can bypass it.',
  pinWrong: 'The PIN does not match. Try again.',
  pinUnavailable: 'Could not save or check the PIN. Try again using HTTPS or localhost.',
  pinMismatch: 'Enter the same four-digit PIN in both fields.',
  limitInvalid: 'Choose a whole number between 5 and 120 minutes.',
  playedToday: (minutes: number) => `Time used today: ${minutes} min.`,
  saveTimeLimit: 'Save time limit',
  limitSaved: 'Limit saved. Time already used today is kept.',
  timeEnding: 'One minute left. We will rest soon.',
  islandResting: 'The island is resting',
  restUntilTomorrow: 'Well done! Tomorrow we will explore again.',
  adventureKept: 'Your adventure is kept here.',
  adultTimeAccess: 'Grown-up settings',

  title: 'Firefly Island',
  switchTo: 'ES',
  switchLabel: 'Cambiar a español',
  skip: 'Skip to content',
  goHome: 'Go to my island',
  brandTop: 'firefly',
  brandBottom: 'island',
  mainNav: 'Main navigation',
  myIsland: 'My island',
  myFriends: 'My friends',
  settings: 'Settings',
  closeWarning: 'Close notice',
  noStorage: 'This browser cannot save. You can play while this tab stays open.',
  saveFailed:
    'You can keep playing, but we cannot save. Download a copy from Settings → For grown-ups before closing.',
  eyebrowHero: 'A LITTLE BIG ADVENTURE',
  heroTitle: 'A little bit of magic.',
  heroTitleEm: 'A world to discover.',
  heroText1: 'Multiply, light up the island and find',
  heroText2: ' new friends. Your island is waiting.',
  lumaHello: "Hi! I'm Luma.",
  lumaHelloName: (name) => `Hi, ${name}! I'm Luma.`,
  askName: "What's your name?",
  wellDone: (name) => `WELL DONE, ${name.toUpperCase()}!`,
  nameLabel: 'Your name',
  nameHint: 'A nickname is fine',
  accountTitle: 'Your account',
  closeInvite: 'Close invitation',
  lumaContinue: 'Shall we carry on with our adventure?',
  lumaStart: 'Will you help me light up the island?',
  ctaContinue: 'Continue my adventure',
  ctaReplay: 'Explore again',
  ctaStart: "Let's explore!",
  sessionNote: '3 short legs · at your own pace ·',
  savedCloud: 'backed up to your account',
  savedHere: 'saved on this device',
  inProgress: (table: number) => `Adventure in progress: ${table} times table`,
  islandWaking: 'YOUR ISLAND IS WAKING UP',
  mapCaption: 'Every light counts. Every adventure too.',
  mapEyebrow: 'YOUR ADVENTURE MAP',
  mapTitle: 'Ten refuges. So much to discover.',
  refugeCount: (n: number) => `${n} of 10 refuges`,
  refugeLabel: (name, table, state) =>
    `${name}, ${table} times table, ${{ done: 'discovered', open: 'available', locked: 'not yet discovered' }[state]}`,
  revisit: 'A PLACE TO COME BACK TO',
  nextDiscovery: 'YOUR NEXT DISCOVERY',
  tableCaps: (table: number) => `${table} TIMES TABLE`,
  waitsForYou: (creature: string) => `${creature} is waiting to practise with you.`,
  discover: (creature: string) => `Plant the garden, cross the river and meet ${creature}.`,
  continueGame: 'Continue game',
  explore: 'Explore',
  footerCalm: 'No rush. Lots of fun.',
  footerCloud: 'Your adventure goes wherever you go.',
  footerLocal: 'Your adventure is saved on this device.',
  collectionEyebrow: 'THE PEOPLE OF YOUR ISLAND',
  collectionTitle: 'A gang full of light.',
  collectionText: 'Visit your friends and discover their little stories.',
  whoLivesHere: 'Who will live here?',
  table: (table: number) => `${table} times table`,
  inRefuge: (decoration: string) => `${decoration} in their refuge · Tap to visit`,
  firstFriend: 'Meet my first friend',
  backToIsland: '← Back to my island',
  lights: (n: number) => `${n} lights`,
  breakEyebrow: '8 MORE STEPS ON YOUR ADVENTURE',
  stretch: "Stretch your arms, take a breath… You're doing great!",
  nextLeg: 'On to the next leg',
  saveAndExit: "I'll carry on another day · Save and exit",
  rewardEyebrow: 'A REFUGE FULL OF LIFE!',
  hasHome: (creature: string) => `${creature} has a home.`,
  litLights: (n: number) => `You lit ${n} lights. Choose something nice for their refuge.`,
  chosen: '✓ Chosen',
  decorate: 'Decorate and meet my friend',
  restTime: 'A good moment for a rest! The island will wait for you.',
  settingsTitle: 'Just the way you like it',
  closeSettings: 'Close settings',
  sound: 'Gentle sounds',
  soundHint: 'When a light switches on',
  motion: 'Animations',
  motionHint: 'A little movement',
  forAdults: 'For grown-ups',
  privacyCloud:
    'Your login and your game are stored in Firebase so you can continue on other devices. No ads or analytics.',
  privacyLocal:
    "Progress is saved in this browser. Clearing the browser's data also deletes this copy. No ads or analytics.",
  done: 'Done',
  adultSummary: (missions, lights) =>
    `${missions} expeditions completed · ${lights} lights. Tables unlock when an expedition is completed, with no speed requirement.`,
  adultMastered:
    'Mastered facts: independent answers across separate reviews. Using help never takes rewards away.',
  adultSupport: 'Worth practising together:',
  adultNoErrors: 'No facts stand out for mistakes yet.',
  adultSession:
    'A session has 24 challenges and two breaks; it takes about 5–10 minutes depending on pace. It can be stopped at any time. Time in the background does not count.',
  seeds: (n: number) => (n === 1 ? 'seed' : 'seeds'),
  tapPlots: (b: number) => `Tap each plot: plant ${b} ${b === 1 ? 'seed' : 'seeds'}.`,
  plotLabel: (i, planted, b) => `Plot ${i}, ${planted ? `${b} seeds` : 'plant'}`,
  groupsOf: (n, b) => `${n} ${n === 1 ? 'group' : 'groups'} of ${b}`,
  seedsWord: 'seeds',
  correct: 'You did it! One more light for your refuge.',
  wrong: "Not yet. Let's look at it with seeds. You can try again.",
  challengeLabel: 'Expedition challenge',
  piecesDone: (n: number) => `${n} of 8 pieces done`,
  challengeOf: (n: number) => `CHALLENGE ${n} OF 8`,
  howManyLights: 'How many lights altogether?',
  yourAnswer: 'Your answer',
  lightUp: 'Light up ✦',
  answerLabel: (n: number) => `Answer ${n}`,
  plantFirst: 'First plant every plot. Then choose the total.',
  hideSeeds: 'Hide seeds',
  showSeeds: "✿ Let's see it with seeds",
  discoverRefuge: 'Discover my refuge',
  legDone: 'Leg complete!',
  keepExploring: 'Keep exploring',
  howItWorks: 'Want to find out how it works?',
  plantGroups: 'Plant groups of seeds',
  backupOpenError: 'The copy could not be opened.',
  noOriginal: 'We could not find the original game in this browser.',
  downloadRequested:
    'Download started. Keep the file outside the browser so you can recover the game.',
  tooBig: 'The copy is too large. The limit is 1 MB.',
  noPrevious: 'There is no previous automatic copy yet.',
  noRestoreYet: 'No game has been restored in this browser yet.',
  downloadBeforeRestoreDone: 'Download started for the game as it was before the last restore.',
  restoreFailed: 'The restore could not be saved. Your current game has not changed.',
  restored: 'Game restored. You can close Settings and carry on with your adventure.',
  recoverFailed: 'The recovery could not be saved. Your current game has not changed.',
  recovered: 'Luma, Pipo, Coral and Mora are available. You can close Settings.',
  backupTitle: 'Your adventure backup',
  backupIntro:
    "Updates keep the game saved in this browser. Also save a file so you can recover it if you change device or clear the browser's data.",
  downloadOriginal: 'Download original game',
  downloadCopy: 'Download copy',
  openCopy: 'Open a copy',
  backupFile: 'Backup file',
  recoverPrevious: 'Recover an earlier game',
  autoCopiesNote:
    "Automatic copies live in this browser. They are deleted too if you clear the browser's data.",
  viewPrevious: 'View previous automatic copy',
  downloadBeforeRestore: 'Download the game from before the restore',
  recoverFour: 'Recover four friends without a copy',
  recoverFourText:
    'Unlocks Luma, Pipo, Coral and Mora on this device. Keeps other friends, practised facts and the adventure in progress. Adds no correct answers or lights. We will save a copy of the current game before changing it.',
  recoverOriginalFirst: 'First recover the original game with a compatible copy.',
  haveFour: 'You already have the four friends',
  recoverFourButton: 'Recover the four friends',
  reviewCopy: 'Check the copy before restoring',
  copySummary: (missions, refuges, lights) =>
    `${missions} expeditions · ${refuges} refuges · ${lights} lights`,
  copyInProgress: (table, index) =>
    `Adventure in progress: ${table} times table, challenge ${index} of 24.`,
  copyReplaces:
    "This copy will replace the game in this browser. We'll save the current one before changing it.",
  restoreThis: 'Restore this copy',
  cancel: 'Cancel',
  readingCopy: 'Reading copy…',
  takeIsland: 'Want to take your island to another device?',
  signIn: 'Sign in or create account',
  searching: 'Looking for your island…',
  authCheckFailed: 'Could not check the account. Reload to try again.',
  authWeak: 'Choose a longer, stronger password.',
  authInUse: 'This email already has an account. Sign in or reset the password.',
  authEmail: 'Check the email address.',
  authCredential: 'Check the email and password.',
  authDisabled: 'Accounts are not enabled yet. You can keep playing without one.',
  authTooMany: 'Too many attempts. Wait a little before trying again.',
  authNetwork: 'Could not connect. Check your connection and try again.',
  resetSent:
    'If an account exists for that email, you will receive instructions to recover access.',
  createTitle: 'Create your island account',
  loginTitle: 'Back to your island',
  closeLogin: 'Close sign-in',
  oneAccount: 'One account keeps one adventure. Use the same login on all your devices.',
  emailLabel: 'Email to recover access',
  passwordLabel: 'Password',
  createNotice:
    'When you create the account, the email and the game are stored in Firebase to sync them. We never ask for a real name or age. No ads or analytics.',
  connecting: 'Connecting…',
  createButton: 'Create my account',
  loginButton: 'Sign in',
  haveAccount: 'I already have an account',
  createAccount: 'Create an account',
  forgot: 'I forgot my password',
  localOpenFailed: "This account's local copy cannot be opened. Its data has been kept.",
  backNoAccount: 'Back without an account',
  choiceFailed: 'The choice could not be saved. Both games are still kept.',
  prepareFailed: 'The game could not be prepared. First download a copy in no-account mode.',
  syncNow: 'Sync now',
  signOut: 'Sign out',
  travelsTitle: 'Your island goes with you',
  bothKept: 'Both versions have been kept. The one you choose will continue on your devices.',
  keepLocal: (n: number) => `Continue the one on this device (${n} friends)`,
  keepRemote: (n: number) => `Continue the one in the cloud (${n} friends)`,
  noSaveYet: "This account has no game yet. You can bring the one you've got here.",
  bringSave: 'Bring my game to this account',
  newIsland: 'Start a new island',
  retry: 'Try again',
};

// Messages produced by the language-independent core, translated at display time.
const CORE_MESSAGES: Record<string, string> = {
  'Esta versión no puede abrir la partida guardada. La original sigue intacta y no se sobrescribirá. Puedes descargarla desde Ajustes → Para acompañantes.':
    'This version cannot open the saved game. The original is untouched and will not be overwritten. You can download it from Settings → For grown-ups.',
  'El guardado no está disponible. Puedes jugar, pero la partida podría perderse al cerrar. Descarga una copia desde Ajustes.':
    'Saving is not available. You can play, but the game may be lost when you close it. Download a copy from Settings.',
  'La copia es demasiado grande. El límite es 1 MB.': en.tooBig,
  'No se puede leer este archivo. Elige una copia del juego en formato JSON.':
    'This file cannot be read. Choose a game copy in JSON format.',
  'Esta copia está dañada o pertenece a otra versión. Tu partida actual sigue intacta.':
    'This copy is damaged or belongs to another version. Your current game is untouched.',
  'Buscando tu isla…': en.searching,
  'Guardando tu isla…': 'Saving your island…',
  'Tu isla está guardada en tu cuenta.': 'Your island is saved to your account.',
  'No se ha podido sincronizar. Tu partida sigue aquí. Reintenta antes de cambiar de dispositivo.':
    'Could not sync. Your game is still here. Try again before switching devices.',
  'Hay dos aventuras diferentes. Elige cuál quieres continuar.':
    'There are two different adventures. Choose which one to continue.',
  'La cuenta está lista para tu primera aventura.':
    'The account is ready for your first adventure.',
  'Guardando la aventura elegida…': 'Saving the chosen adventure…',
};

function storedLang(): Lang {
  try {
    return window.localStorage.getItem(LANGUAGE_KEY) === 'en' ? 'en' : 'es';
  } catch {
    return 'es';
  }
}

const I18n = createContext({
  lang: 'es' as Lang,
  t: es,
  content: CONTENT.es,
  toggle: () => {},
  core: (message: string) => message,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState(storedLang);
  const t = lang === 'en' ? en : es;
  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = t.title;
    try {
      window.localStorage.setItem(LANGUAGE_KEY, lang);
    } catch {
      /* The choice simply won't be remembered. */
    }
  }, [lang, t]);
  return (
    <I18n.Provider
      value={{
        lang,
        t,
        content: CONTENT[lang],
        toggle: () => setLang(lang === 'en' ? 'es' : 'en'),
        core: (message) => (lang === 'en' ? (CORE_MESSAGES[message] ?? message) : message),
      }}
    >
      {children}
    </I18n.Provider>
  );
}

export const useI18n = () => useContext(I18n);

export function LanguageToggle() {
  const { t, toggle } = useI18n();
  return (
    <button className="language-button" aria-label={t.switchLabel} onClick={toggle}>
      {t.switchTo}
    </button>
  );
}
