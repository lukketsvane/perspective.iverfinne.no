import { ACTS, CARDS } from './lesson';

/**
 * THE LESSON, IN THREE LANGUAGES.
 *
 * The deck is written in nynorsk and stays written in nynorsk: it is the one
 * place in this app where a person is told something in words rather than
 * shown a mark, and the words were made there. What this file adds is the two
 * other ways in - bokmål, because a reader who has to translate as they go is
 * a reader spending on the language what the card wanted spent on the picture,
 * and English, because the thing being taught is not a Norwegian thing.
 *
 * WORDS ONLY. Nothing in here stages anything: the cast, the sheet, the field,
 * the gates and the sweeps live in lib/lesson.ts and are the same in every
 * language, because they are the lesson. This is the caption track. A card is
 * its index in CARDS and nothing else, which is what makes the tables below
 * readable and is also their one hazard - the note above ACTS applies twice
 * over here, since a card inserted in the middle of the deck silently shifts
 * every translated card under it. `lessonWords` refuses a table that is not
 * the same length as the deck rather than showing the wrong words for a
 * picture, which is the failure worth catching.
 *
 * THE VOCABULARY IS TRANSLATED, NOT REPLACED. `arket`, `knippet`, `punktet`,
 * `linja` are plain words chosen so that somebody can picture what they name -
 * see the glossary card - so the other two languages take the plain word in
 * their own language and not the trade's: `the sheet`, not `the picture
 * plane`. The whole point of the glossary card is that the trade's names
 * arrive at the end, once the ideas are already there.
 */

export type LessonLanguage = 'nn' | 'nb' | 'en';

/** What a card says. Everything else about it is staging. */
export interface CardWords {
  headline: string;
  body: string;
  found?: string;
  terms?: Array<[ours: string, theirs: string]>;
}

/** What an act's title card says. */
export interface ActWords {
  title: string;
  line: string;
}

export interface LessonWords {
  acts: ActWords[];
  cards: CardWords[];
  /** The label under the deck: on to the next, and on the last card. */
  onward: string;
  draw: string;
}

/**
 * The three, in the order they are offered.
 *
 * Two letters each, because the control is a mark in the corner of a picture
 * and not a menu: the codes are the ones a Norwegian reader already knows off
 * every form they have ever filled in, and `EN` needs no explaining anywhere.
 * The full name is the accessible one, in the language it names - a person who
 * cannot read the deck cannot read a label about the deck either.
 */
export const LESSON_LANGUAGES: Array<{ code: LessonLanguage; short: string; name: string }> = [
  { code: 'nn', short: 'NN', name: 'Leksjonen på nynorsk' },
  { code: 'nb', short: 'NB', name: 'Leksjonen på bokmål' },
  { code: 'en', short: 'EN', name: 'The lesson in English' },
];

const REMEMBERED = 'kjg-perspective-lesson-language';

/**
 * Which language the deck was last read in.
 *
 * Remembered, and deliberately not part of the settings the store persists:
 * this is not a property of the drawing, it is which of three ways in the
 * reader used, and somebody who read the lesson in English once should not
 * have to find the switch again. A first visit gets the language the deck was
 * written in.
 */
export const lessonLanguage = (): LessonLanguage => {
  try {
    const stored = localStorage.getItem(REMEMBERED);
    if (stored === 'nb' || stored === 'en' || stored === 'nn') return stored;
  } catch {
    /* a browser that cannot remember it opens on the deck's own language */
  }
  return 'nn';
};

export const rememberLessonLanguage = (language: LessonLanguage) => {
  try {
    localStorage.setItem(REMEMBERED, language);
  } catch {
    /* the choice still holds for as long as the lesson is open */
  }
};

/* ------------------------------------------------------------------ bokmål */

const BOKMAL_ACTS: ActWords[] = [
  { title: 'Kula', line: 'Et bilde er et kart over alt du ser' },
  { title: 'Øyet', line: 'Horisonten er ikke et sted. Den er høyden din' },
  { title: 'Punktene', line: 'Hvor de kommer fra, og hvorfor de ikke flytter seg' },
  { title: 'Arkene', line: 'Samme verden, tre ark å fange den på' },
  { title: 'Hånda', line: 'Fra rutenettet til blyanten' },
];

const BOKMAL_CARDS: CardWords[] = [
  {
    headline: 'En kule av retninger',
    body: 'Stå stille. Alt du ser, ser du i en retning, og alle retningene til sammen er en kule rundt øyet ditt. Et bilde er et kart over den kula. Ikke noe mer. Se kartet bli til: synsfeltet åpner seg til hele kula ligger på siden.',
    found: 'Der er det: en rund side med papir rundt, og alt du kunne se fra det stedet, står et sted inne i sirkelen. Et bilde er ikke et vindu og ikke en boks. Det er kula di, lagt flat.',
  },
  {
    headline: 'Snu deg helt rundt',
    body: 'Dra på bildet og snu deg hele veien rundt. Se etter en kant på kula.',
    found: 'Den finnes ikke. Kula har ingen kant, for den er ikke noe du ser PÅ: den er alle retningene fra deg, og du står midt i den.',
  },
  {
    headline: 'Hva fanger du kula på?',
    body: 'Kula er ikke et bilde ennå. Et bilde er en flate med merker på, så kula må fanges på en flate og legges ut på papiret. Se: samme scenen, samme stedet, tre ulike ark etter tur.',
    found: 'Samme verden i alle tre; bare arket skiftet. Det flate holdt hver kant rett og strakk hjørnene. Sylinderen holdt loddlinjene rette og bøyde resten. Kula bøyde alt, jevnt. Å velge ark er å velge hva som får være rett.',
  },
  {
    headline: 'Hovedpunktet og horisonten',
    body: 'Krysset midt i bildet er hovedpunktet: der du ser, avmerket på flata. Ringene er noe annet. Snu deg og se etter hva som flytter seg og hva som ikke gjør det.',
    found: 'Ringene gled; krysset stod. Ringene er punkter i verden og følger rommet. Krysset er ikke en ting i verden i det hele tatt: det er retningen DU ser i, avmerket på arket, og derfor kan det ikke flytte seg. Horisonten er samme slags merke - alle retningene som ligger vannrett fra deg - og derfor følger den øyet ditt og ikke bakken. De to er de første merkene noen setter på en side.',
  },
  {
    headline: 'Alt i din egen høyde',
    body: 'Fire stolper, alle nøyaktig like høye som øyet ditt. Den nærmeste står fem meter unna, den fjerneste over førti. Snu deg og se hvor horisonten krysser dem.',
    found: 'Den krysser alle fire i toppen. Fem meter unna og førti meter unna: samme kuttet. Horisonten ligger i din egen høyde, så alt som rekker deg til øynene, ender nøyaktig på den - uansett hvor langt unna det står.',
  },
  {
    headline: 'Linja er en målestokk',
    body: 'Et pult på 75 cm, en bil på 150, en dør på 210 - og haren, som er 170 til issen. Se hvor linja går på hver av dem.',
    found: 'Over pulten, over bilen, gjennom døra et stykke under karmen - og tvers over issen på haren, som er nøyaktig så høy som øyet ditt sitter. Kroppen din kan disse høydene alt: pulten til låret, bilen til brystet, døra over hodet. Sett linja der øyet er, og hver størrelse er en avlesning, ikke en gjetning.',
  },
  {
    headline: 'Øyet flytter seg med deg',
    body: 'Ingenting på gulvet rører seg nå. Bare du - ned på huk, og opp igjen.',
    found: 'Linja fulgte deg. Den er ikke et sted i verden; den er høyden din - så å sette den er å velge hvor den som ser, står, og å finne den i en fremmed tegning er å finne igjen øyet som så. Se toppflatene på veien: de lukker seg jo nærmere linja de kommer, og RETT på den er de borte. En flate du ser oppå, ligger under øyet ditt.',
  },
  {
    headline: 'Hele flokken på én gang',
    body: 'En flokk, alle 170 cm høye, fra fem meter unna til nesten tretti. Gå: hold tommelen på venstre side av bildet, ovenfor disse ordene, og dra. Hold øye med hvor linja krysser dem.',
    found: 'Den skjærer dem i issen, hver eneste én, og den slapp ikke taket mens du gikk. Den nærmeste og den fjerneste er kuttet i nøyaktig samme høyde på kroppen, for linja ligger i DIN høyde og de er den høyden. Avstand kommer ikke inn i det. Slik tegnes en flokk: linja først, så føttene, og hodene følger av seg selv.',
  },
  {
    headline: 'De som står høyere',
    body: 'Samme flokken. Tre av dem har gått opp på en opphøyd flate. Se hvor linja tar dem nå - og hvor den fortsatt tar de andre.',
    found: 'I knærne. Flata er 1,2 meter høy, og linja faller nøyaktig 1,2 meter lenger ned på kroppene deres. Regelen handler ikke om folk; den handler om GULV: horisonten krysser alt som er i din høyde regnet fra det samme gulvet du står på. Hvert trappetrinn og hver fortauskant deler bildet i to slike gulv, og hvert av dem skal leses mot linja for seg.',
  },
  {
    headline: 'Størrelse ut av stedet',
    body: 'To like kasser, begge 2,4 meter høye: én fem meter unna, én atten. Se hvor horisonten skjærer hver av dem.',
    found: 'Samme brøkdelen av høyden på begge - sju tideler oppe. Det er linja brukt baklengs: du vet hvor føttene står, du vet hvor linja går, og forholdet mellom dem ER høyden. Derfor kan du sette en kasse på 2,4 hvor som helst på arket og vite nøyaktig hvor høy den skal tegnes, uten å gjette og uten å måle noe i verden.',
  },
  {
    headline: 'Parallelle linjer møtes',
    body: 'En rekke kasser, alle med samme retningen. Følg en kant utover: jo lenger ut du ser, jo mer ser du LANGS den og jo mindre PÅ den. Til slutt ser du rent langs - det er punktet.',
  },
  {
    headline: 'Punktet flytter seg ikke',
    body: 'Gå: hold tommelen på venstre side av bildet, ovenfor disse ordene, og dra. Hold øye med punktet mens kassene glir forbi.',
    found: 'Kassene flyttet seg. Punktet stod stille. Det hører til RETNINGEN, ikke til kassene og ikke til stedet du står på - derfor kan du merke av punktene én gang og tegne hele siden mot dem.',
  },
  {
    headline: 'Dybden kryper sammen',
    body: 'Samme rekka, nærmere. Hver kasse står nøyaktig én meter fra den neste. Se på stegene mellom dem - hva gjør de på veien inn mot punktet?',
    found: 'De kryper sammen. Like steg i verden blir krympende steg på arket, og flata nærmest punktet blir en smal stripe - å tegne den for dyp er et av de vanligste feilgrepene i faget. Stol derfor på det som gjentar seg: vinduer, master, heller. Alt som står jevnt i verden, måler dybden for deg på arket.',
  },
  {
    headline: 'Hvert knippe har to punkter',
    body: 'Samme rekka, men på det bøyde arket. Snu deg helt rundt og finn det andre punktet.',
    found: 'Der er det. En retning stikker gjennom kula to steder, så et knippe parallelle kanter har TO punkter: ett forover, ett bakover. Det flate arket kan bare vise deg det ene av dem.',
  },
  {
    headline: 'Ett punkt',
    body: 'Tilbake til det flate arket, med en kasse rett på. To av de tre knippene ligger parallelt med arket og holder seg parallelle på papiret også; bare det tredje går innover. Ett punkt - og det ligger midt i bildet, for du ser rett langs retningen.',
  },
  {
    headline: 'To punkter',
    body: 'Ikke rør kassa. Snu deg litt til siden og se hva som skjer med kantene som gikk rett på.',
    found: 'To punkter nå, ett til hver side - og ingenting i verden har endret seg. Arket står vinkelrett på blikket ditt, så da du snudde deg, sluttet kantene å ligge parallelt med det. «Ett punkt» og «to punkter» er ikke to slags kasser. Det er samme kassa, sett fra to steder.',
  },
  {
    headline: 'Tre punkter',
    body: 'Samme kassa igjen. Dra oppover og se opp på den.',
    found: 'Nå ligger ikke loddlinjene parallelt med arket heller, så de samler seg også, i et punkt over deg. Tre knipper, tre punkter, samme kassa, samme stedet. Du løftet bare blikket.',
  },
  {
    headline: 'Hver kasse sitt eget par',
    body: 'Et gulv med kasser snudd hver sin vei. Trykk på en av dem, så på en annen, og følg punktene mens du bytter.',
    found: 'Punktene hoppet; kassene rørte seg ikke. Hver eneste ting i en scene har sitt eget par, og alle parene ligger på den samme linja: hver vannrett retning i verden eier sine to punkter på horisonten, og å snu en kasse er bare å skyve paret dens langs den. Det finnes ikke en scene som er «i topunktsperspektiv». Det finnes et ståsted, og så mange par som det er retninger i det du tegner.',
  },
  {
    headline: 'Ingenting av dette er kassa',
    body: 'Ett, to og tre punkter er ikke tre slags kasser, og ikke tre systemer. Tallet sier bare hvor mange av de tre knippene som ikke ligger parallelt med arket ditt - og det er en opplysning om DEG, hvor du står og hvor du ser, ikke om det du tegner.',
  },
  {
    headline: 'Rampa har sine egne',
    body: 'En rampe, og en flat helle av samme størrelsen ved siden av. Kantene oppover rampa er et knippe som alle andre - men de ligger ikke vannrett. Snu deg helt rundt og finn de to punktene deres.',
    found: 'Over og under horisonten, akkurat så mye som rampa stiger. Hella ved siden av har paret sitt på linja, slik alt annet du har sett har hatt det - og det var aldri en regel om punkter. Det var en regel om GULV: et knippe har paret sitt på horisonten hvis og bare hvis det ligger vannrett. Tak, trapper, stiger, bakker, åpne lokk: hvert av dem tar med seg to punkter til inn i tegningen din.',
  },
  {
    headline: 'Sideflata krymper',
    body: 'To like kasser, nøyaktig like langt unna. Den ene ligger rett på punktet sitt; den andre langt fra det. Se på sideflatene.',
    found: 'Den som ligger på punktet, viser nesten ingen side - bare en ren framside. Den andre viser en bred en. De står like langt unna, så avstand er ikke det som gjør det: en flate lukker seg etter hvor nær den ligger punktet sitt på arket, og er helt borte når den når det. Derfor får en ting du plasserer midt på punktet ditt ingen form, og derfor flytter tegnere ting til siden.',
  },
  {
    headline: 'Det flate arket tar slutt',
    body: 'Verktøylinja er tilbake. Kjegla nederst er synsfeltet - hvor stor bit av kula arket ditt tar med. Dra i den og åpne det så vidt det går.',
    found: 'Se hjørnene. En rett linje holder seg rett på dette arket, og det er hele verdien av det. Prisen er at avstanden fra midten vokser som TANGENTEN til vinkelen, og tangenten springer fra deg: ved 180 grader er den uendelig. Ingen linjal retter opp strekket i hjørnene; det er arkets, ikke håndas. Derfor finnes de bøyde arkene.',
  },
  {
    headline: 'Fire punkter',
    body: 'Samme scenen, fanget på sylinderen: loddlinjene rette, de vannrette bøyde. Se hva som kommer fram når synsfeltet åpner seg helt - et bånd med papir over og under, som møter seg selv i endene, og fire punkter på arket samtidig.',
  },
  {
    headline: 'Fem punkter',
    body: 'Og til slutt: kula selv. Åpnet helt er arket en rund side med papir rundt, og kanten er retningen rett bak deg. Fire punkter rundt horisonten, ett rett opp, ett rett ned - og avstanden fra midten er vinkelen selv.',
  },
  {
    headline: 'En kasse har seks',
    body: 'Én kasse, hele kula. Snu deg sakte rundt og tell de ringede punktene.',
    found: 'Seks: fire rundt horisonten, ett rett opp, ett rett ned. Tre knipper, to punkter hver. På det flate arket så du ett, to eller tre av dem, og resten lå bak deg. De har vært der hele tiden.',
  },
  {
    headline: 'Navnene de andre bruker',
    body: 'Samme sakene, andre ord. Slik står de i bøkene:',
    found: 'Ordene her er valgt fordi du kan se dem for deg; ordene der fordi de er presise. Nå kan du lese begge. Bare ett er verdt å krangle om: «trepunktsperspektiv» ser ut som et system og er det ikke.',
    terms: [
      ['Arket', 'Bildeplanet'],
      ['Knippet', 'Parallellknippe'],
      ['Punktet', 'Forsvinningspunkt'],
      ['Hovedpunktet', 'Sentralpunktet, øyepunktet'],
      ['Linja', 'Horisontlinja'],
      ['Ståstedet', 'Stasjonspunktet'],
      ['Synsfeltet', 'Synsvinkelen, bildevinkelen'],
      ['Antallet punkter', 'Sentral-, to- og trepunktsperspektiv'],
    ],
  },
  {
    headline: 'Strek opp arket først',
    body: 'Dette er arket man streker opp når alt omkring deg skal med. Meridianene står femten grader fra hverandre og møtes i de samme seks punktene: hver oppreist kant i verden følger en av kurvene, og hver vannrett kant krysser dem jevnt.',
  },
  {
    headline: 'Sikt langs kurvene',
    body: 'Snu deg og se deg omkring. Velg én oppreist kant på en kasse og følg den mens du snur.',
    found: 'Den slipper aldri kurva si. Det er dette som gjør fem punkter mulig å tegne på frihånd: ingenting skal regnes ut, du skal bare vite hvilken kurve kanten hører til.',
  },
  {
    headline: 'Kube eller langkasse?',
    body: 'To former, begge med midten nøyaktig på øyehøyde og begge rett på. Én av dem er en kube. Se bort fra skyggene, snu deg til siden, og finn ut hvilken.',
    found: 'Rett forfra tegnet de seg som det samme rektangelet, og det stod ikke på hånda di. En kube midt på linja har ingen toppflate - på linja finnes det ingen - ingen bunnflate av samme grunn, og ingen sideflate, for den ligger på punktet sitt. Igjen står et rent rektangel, og en kasse to og en halv gang så dyp tegner seg likt. Bare skyggen røpte det. Legg derfor aldri hovedmotivet midt på øyehøyden og rett på.',
  },
  {
    headline: 'Hvor krysset står',
    body: 'Det flate arket igjen, og krysset midt i bildet er hovedpunktet. Snu deg sakte, så gata glir ut til siden av det, og hold øye med hjørnene.',
    found: 'Med krysset midt i motivet ligger strekket jevnt fordelt, og ingen kant er verre enn en annen. Skyv motivet ut til siden, og hjørnet lengst fra krysset strekker seg mest - samme prisen som før, for avstanden fra midten vokser som tangenten. Forskjellen er at det er DU som velger hvor mye av den bildet skal betale, og hvor. Midt i: ro. Ute til siden: spenning, og et hjørne du må holde øye med.',
  },
  {
    headline: 'Det samme, om igjen',
    body: 'En rekke like stolper, jevnt satt, på det oppstrekede arket - og en flokk mellom dem. Ingenting nytt i konstruksjonen. Bare den samme formen om og om igjen.',
    found: 'Slik tegnes dybden faktisk. Ett enslig motiv gir deg ingenting å måle med; en rekke av det samme gir deg målestokken innebygd i bildet, for du VET at stegene er like store i verden og kan se hvor fort de krymper på arket. Vinduer, heller, master, stolper - og hodene i en flokk, som alle ligger på den samme linja.',
  },
  {
    headline: 'Tegn en selv',
    body: 'Nå er arket ditt. Blyanten tegner grunnflata og drar den opp; hold på en kasse og slå på dens egne punkter, så ser du hvor kanten skal peke.',
    found: 'Og du trenger ikke finne på motivet. På hylla ligger en side med kasser å øve på, og den er fem oppgaver: en gate, en trapp, en stige som halverer seg for hver dobling, en flokk i din egen høyde, og svermen. Vil du tegne rommet du sitter i, legg et foto bak rutenettet og finn øyehøyden i det. Resten er timer.',
  },
];

/* ----------------------------------------------------------------- English */

const ENGLISH_ACTS: ActWords[] = [
  { title: 'The sphere', line: 'A picture is a map of everything you can see' },
  { title: 'The eye', line: 'The horizon is not a place. It is your own height' },
  { title: 'The points', line: 'Where they come from, and why they never move' },
  { title: 'The sheets', line: 'The same world, three sheets to catch it on' },
  { title: 'The hand', line: 'From the ruled sheet to the pencil' },
];

const ENGLISH_CARDS: CardWords[] = [
  {
    headline: 'A sphere of directions',
    body: 'Stand still. Everything you see, you see in a direction, and all the directions together are a sphere around your eye. A picture is a map of that sphere. Nothing more. Watch the map being made: the field opens until the whole sphere is on the page.',
    found: 'There it is: a round picture with paper around it, and everything you could see from that spot stands somewhere inside the circle. A picture is not a window and not a box. It is your sphere, laid flat.',
  },
  {
    headline: 'Turn all the way round',
    body: 'Drag the picture and turn the whole way round. Look for an edge to the sphere.',
    found: 'There is none. The sphere has no edge, because it is not something you look AT: it is every direction from you, and you are standing in the middle of it.',
  },
  {
    headline: 'What do you catch it on?',
    body: 'The sphere is not a picture yet. A picture is a surface with marks on it, so the sphere has to be caught on a surface and laid out on paper. Watch: the same scene, the same spot, three different sheets in turn.',
    found: 'The same world in all three; only the sheet changed. The flat one held every edge straight and stretched the corners. The cylinder held the uprights straight and bent the rest. The sphere bent everything, evenly. Choosing a sheet is choosing what gets to be straight.',
  },
  {
    headline: 'The middle point and the horizon',
    body: 'The cross in the middle of the picture is the middle point: where you are looking, marked on the sheet. The rings are something else. Turn, and see what moves and what does not.',
    found: 'The rings slid; the cross stood still. The rings are points in the world and follow the room. The cross is not a thing in the world at all: it is the direction YOU are looking in, marked on the sheet, which is why it cannot move. The horizon is the same kind of mark - every direction that runs level from you - which is why it follows your eye and not the ground. Those two are the first marks anybody puts on a page.',
  },
  {
    headline: 'Everything at your own height',
    body: 'Four posts, every one exactly as tall as your eye. The nearest is five metres away, the furthest over forty. Turn, and watch where the horizon crosses them.',
    found: 'It crosses all four at the top. Five metres away and forty metres away: the same cut. The horizon lies at your own height, so anything that reaches your eyes ends exactly on it - however far off it stands.',
  },
  {
    headline: 'The line is a ruler',
    body: 'A desk at 75 cm, a car at 150, a door at 210 - and the hare, 170 to the crown of the head. Watch where the line runs on each of them.',
    found: 'Above the desk, above the car, through the door a little below the head of the frame - and straight across the crown of the hare, who is exactly as tall as your eye sits. Your body already knows these heights: the desk at your thigh, the car at your chest, the door above your head. Put the line where the eye is, and every size is a reading rather than a guess.',
  },
  {
    headline: 'The eye moves with you',
    body: 'Nothing on the floor is moving now. Only you - down into a crouch, and up again.',
    found: 'The line followed you. It is not a place in the world; it is your height - so setting it is choosing where the person looking stands, and finding it in somebody else’s drawing is finding the eye that saw. Watch the top faces along the road: they close the nearer the line they get, and ON it they are gone. A face you can see the top of is a face below your eye.',
  },
  {
    headline: 'The whole crowd at once',
    body: 'A crowd, all of them 170 cm, from five metres away to nearly thirty. Walk: put a thumb on the left of the picture, above these words, and drag. Keep watching where the line crosses them.',
    found: 'It cuts them at the crown, every single one, and it never let go while you walked. The nearest and the furthest are cut at exactly the same height on the body, because the line lies at YOUR height and that is the height they are. Distance does not come into it. That is how a crowd is drawn: the line first, then the feet, and the heads follow of their own accord.',
  },
  {
    headline: 'The ones standing higher',
    body: 'The same crowd. Three of them have stepped up onto a raised floor. Watch where the line takes them now - and where it still takes the others.',
    found: 'At the knees. The floor is 1.2 metres up, and the line falls exactly 1.2 metres lower on their bodies. The rule is not about people; it is about FLOORS: the horizon crosses everything at your own height measured from the same floor you are standing on. Every step and every kerb splits the picture into two such floors, and each of them is read against the line on its own.',
  },
  {
    headline: 'Size out of position',
    body: 'Two identical boxes, both 2.4 metres tall: one five metres off, one eighteen. Watch where the horizon cuts each of them.',
    found: 'The same fraction of the height on both - seven tenths up. That is the line used backwards: you know where the feet stand, you know where the line runs, and the ratio between them IS the height. So you can put a 2.4 metre box anywhere on the sheet and know exactly how tall to draw it, without guessing and without measuring anything in the world.',
  },
  {
    headline: 'Parallel lines meet',
    body: 'A rank of boxes, all facing the same way. Follow one edge outwards: the further out you look, the more you are looking ALONG it and the less you are looking AT it. In the end you are looking purely along - that is the point.',
  },
  {
    headline: 'The point does not move',
    body: 'Walk: put a thumb on the left of the picture, above these words, and drag. Keep your eye on the point while the boxes slide past.',
    found: 'The boxes moved. The point stood still. It belongs to the DIRECTION, not to the boxes and not to the spot you are standing on - which is why you can mark the points once and draw the whole page towards them.',
  },
  {
    headline: 'Depth crowds together',
    body: 'The same rank, closer. Each box stands exactly one metre from the next. Watch the steps between them - what do they do on the way in to the point?',
    found: 'They crowd together. Equal steps in the world become shrinking steps on the sheet, and the face nearest the point becomes a narrow strip - drawing it too deep is one of the commonest mistakes in the trade. So trust whatever repeats: windows, posts, paving. Anything evenly spaced in the world measures the depth for you on the sheet.',
  },
  {
    headline: 'Every family has two points',
    body: 'The same rank, but on the curved sheet. Turn all the way round and find the second point.',
    found: 'There it is. One direction pierces the sphere in two places, so a family of parallel edges has TWO points: one ahead, one behind. A flat sheet can only ever show you one of them.',
  },
  {
    headline: 'One point',
    body: 'Back to the flat sheet, with a box square on. Two of the three families lie parallel to the sheet and stay parallel on the paper too; only the third runs inwards. One point - and it sits in the middle of the picture, because you are looking straight along the direction.',
  },
  {
    headline: 'Two points',
    body: 'Do not touch the box. Turn a little to the side and watch what happens to the edges that ran square on.',
    found: 'Two points now, one to each side - and nothing in the world has changed. The sheet stands square to your gaze, so the moment you turned, the edges stopped lying parallel to it. “One point” and “two point” are not two kinds of box. It is the same box, seen from two places.',
  },
  {
    headline: 'Three points',
    body: 'The same box again. Drag upwards and look up at it.',
    found: 'Now the uprights are not parallel to the sheet either, so they gather as well, at a point above you. Three families, three points, the same box, the same spot. All you did was raise your eyes.',
  },
  {
    headline: 'Every box its own pair',
    body: 'A floor of boxes, each turned its own way. Tap one, then another, and follow the points as you switch.',
    found: 'The points jumped; the boxes did not move. Every single thing in a scene has its own pair, and all the pairs lie on the same line: each level direction in the world owns its two points on the horizon, and turning a box only slides its pair along it. There is no such thing as a scene that is “in two-point perspective”. There is a place you stand, and as many pairs as there are directions in what you are drawing.',
  },
  {
    headline: 'None of this is the box',
    body: 'One, two and three point are not three kinds of box, and not three systems. The number only says how many of the three families do not lie parallel to your sheet - and that is a fact about YOU, where you stand and where you look, not about the thing you are drawing.',
  },
  {
    headline: 'The ramp has its own',
    body: 'A ramp, and a flat slab of the same size beside it. The edges running up the ramp are a family like any other - but they are not level. Turn all the way round and find their two points.',
    found: 'Above and below the horizon, by exactly as much as the ramp climbs. The slab beside it has its pair on the line, the way everything else you have seen has - and it was never a rule about points. It was a rule about FLOORS: a family has its pair on the horizon if and only if it lies level. Roofs, stairs, ladders, hills, open lids: each of them brings two more points into your drawing.',
  },
  {
    headline: 'The side face shrinks',
    body: 'Two identical boxes, exactly the same distance away. One sits right on its point; the other far from it. Look at the side faces.',
    found: 'The one on the point shows almost no side - just a clean front. The other shows a broad one. They are the same distance off, so distance is not what does it: a face closes according to how near its point it lies on the sheet, and is gone altogether when it reaches it. That is why a thing placed on your middle point gets no form, and why draughtsmen move things to the side.',
  },
  {
    headline: 'The flat sheet runs out',
    body: 'The dock is back. The cone at the bottom is the field - how much of the sphere your sheet takes in. Drag it and open the sheet as far as it goes.',
    found: 'Look at the corners. A straight line stays straight on this sheet, and that is the whole worth of it. The price is that distance from the middle grows as the TANGENT of the angle, and the tangent runs away from you: at 180 degrees it is infinite. No ruler straightens the stretch in the corners; it belongs to the sheet, not to your hand. That is why the curved sheets exist.',
  },
  {
    headline: 'Four points',
    body: 'The same scene, caught on the cylinder: the uprights straight, the level edges bent. Watch what comes out when the field opens all the way - a band with paper above and below, meeting itself at the ends, and four points on the sheet at once.',
  },
  {
    headline: 'Five points',
    body: 'And last: the sphere itself. Opened right up, the sheet is a round picture with paper around it, and the rim is the direction straight behind you. Four points around the horizon, one straight up, one straight down - and distance from the middle is the angle itself.',
  },
  {
    headline: 'A box has six',
    body: 'One box, the whole sphere. Turn slowly round and count the ringed points.',
    found: 'Six: four around the horizon, one straight up, one straight down. Three families, two points each. On the flat sheet you saw one, two or three of them, and the rest were behind you. They have been there all along.',
  },
  {
    headline: 'The names everybody else uses',
    body: 'The same things, other words. Here is how they stand in the books:',
    found: 'The words here were chosen because you can picture them; the words there because they are exact. Now you can read both. Only one is worth arguing about: “three-point perspective” looks like a system and is not one.',
    terms: [
      ['The sheet', 'The picture plane'],
      ['The family', 'A family of parallels'],
      ['The point', 'The vanishing point'],
      ['The middle point', 'The principal point, the centre of vision'],
      ['The line', 'The horizon line'],
      ['Where you stand', 'The station point'],
      ['The field', 'The angle of view'],
      ['The number of points', 'One-, two- and three-point perspective'],
    ],
  },
  {
    headline: 'Rule the sheet first',
    body: 'This is the sheet you rule up when everything around you has to fit on it. The meridians stand fifteen degrees apart and meet at the same six points: every upright edge in the world follows one of the curves, and every level edge crosses them evenly.',
  },
  {
    headline: 'Sight along the curves',
    body: 'Turn, and look around you. Pick one upright edge on a box and follow it as you turn.',
    found: 'It never leaves its curve. That is what makes five point drawable freehand: nothing has to be worked out, you only have to know which curve the edge belongs to.',
  },
  {
    headline: 'Cube or long box?',
    body: 'Two forms, both with their middle exactly at eye height and both square on. One of them is a cube. Ignore the shadows, turn to the side, and work out which.',
    found: 'Straight on they drew as the same rectangle, and that was not your hand’s doing. A cube in the middle of the line has no top face - on the line there is none - no bottom face for the same reason, and no side face, because it sits on its point. What is left is a plain rectangle, and a box two and a half times as deep draws the same. Only the shadow gave it away. So never put the main subject in the middle of eye height and square on.',
  },
  {
    headline: 'Where the cross stands',
    body: 'The flat sheet again, and the cross in the middle of the picture is the middle point. Turn slowly, so the street slides off to one side of it, and keep an eye on the corners.',
    found: 'With the cross in the middle of the subject the stretch is spread evenly, and no edge is worse off than another. Push the subject to the side, and the corner furthest from the cross stretches most - the same price as before, since distance from the middle grows as the tangent. The difference is that YOU choose how much of it the picture pays, and where. Middle: calm. Off to the side: tension, and a corner to watch.',
  },
  {
    headline: 'The same thing, over again',
    body: 'A rank of identical posts, evenly spaced, on the ruled sheet - and a crowd between them. Nothing new in the construction. Only the same form over and over.',
    found: 'That is how depth actually gets drawn. A single lone subject gives you nothing to measure with; a rank of the same thing gives you the ruler built into the picture, because you KNOW the steps are equal in the world and can see how fast they shrink on the sheet. Windows, paving, posts, poles - and the heads in a crowd, all of them on the same line.',
  },
  {
    headline: 'Draw one yourself',
    body: 'The sheet is yours now. The pencil draws the base and pulls it up; hold a box and turn on its own points, and you can see where the edge has to aim.',
    found: 'And you do not have to invent the subject. There is a page of boxes to practise on in the shelf, and it is five exercises: a street, a stair, a ladder that halves with every doubling, a crowd at your own height, and the swarm. To draw the room you are sitting in, put a photograph behind the grid and find the eye height in it. The rest is hours.',
  },
];

/* ------------------------------------------------------------------------ */

const nynorsk = (): LessonWords => ({
  acts: ACTS.map(({ title, line }) => ({ title, line })),
  cards: CARDS.map(({ headline, body, found, terms }) => ({ headline, body, found, terms })),
  onward: 'Vidare',
  draw: 'Teikn',
});

/**
 * The words of the deck, in one of the three.
 *
 * A table that has fallen out of step with the deck is not shown at all: the
 * cards are matched by position, so a missing or added card would put every
 * sentence below it under the wrong picture - which is worse than reading it
 * in the language it was written in.
 */
export const lessonWords = (language: LessonLanguage): LessonWords => {
  if (language === 'nb' && BOKMAL_CARDS.length === CARDS.length && BOKMAL_ACTS.length === ACTS.length) {
    return { acts: BOKMAL_ACTS, cards: BOKMAL_CARDS, onward: 'Videre', draw: 'Tegn' };
  }
  if (language === 'en' && ENGLISH_CARDS.length === CARDS.length && ENGLISH_ACTS.length === ACTS.length) {
    return { acts: ENGLISH_ACTS, cards: ENGLISH_CARDS, onward: 'Next', draw: 'Draw' };
  }
  return nynorsk();
};
