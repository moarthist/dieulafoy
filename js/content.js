// All the text of the museum: the six rooms, the albums and the introduction.
// Which page hangs in which room is decided in tools/build_data.py.

export const MUSEUM = {
  name: 'Dieulafoy',
  title: 'Jane Dieulafoy: The Photographs',
  tagline: 'A micro museum of the eight Dieulafoy albums kept at the INHA library in Paris, in six rooms.',
  credit: {
    name: 'Mahmoud Mohammadi',
    lines: ['MA Visual Arts – Arts, Museology and Curatorship', 'University of Bologna'],
  },
  intro: [
    'Between 1881 and 1886 Jane Dieulafoy (1851–1916) crossed Persia twice with her husband, the engineer Marcel Dieulafoy: first on a journey through the country’s monuments, then on the excavation of Susa, whose glazed-brick friezes went to the Louvre. She travelled in men’s clothes, wrote the books that made the journeys famous, and photographed what she saw.',
    'After Marcel’s death in 1920 their albums entered the library of the Institut national d’histoire de l’art (INHA). Six of them are on Persia, one on Spain and Portugal, and one, “Divers”, holds everything else. Together they contain well over a thousand prints, mounted several to a page and captioned in ink.',
    'This museum hangs every captioned page of the eight albums, 774 in all, sorted into six rooms by subject. Each one opens at full resolution from the INHA image server.',
  ],
  caveat: 'The albums mix photographs taken by the Dieulafoys with prints given to them or bought: the 1892–94 Sémiramis mission led by Louis Lapicque (Perse 3), Charles Babin and Frédéric Houssay, their assistants at Susa (Perse 6), and commercial studios such as Mansell and Neurdein (Divers). A page in this museum is a page of their albums, not always a photograph by Jane.',
  rights: 'Scans and captions: Bibliothèque de l’INHA, collections Jacques Doucet, public domain. This project is independent and is not affiliated with the INHA.',
};

export const ROOMS = [
  {
    id: 'journey', n: 1, color: '#a5732c', ink: '#2b1c08',
    title: 'The Road East',
    subtitle: 'Journeys, rivers and camps',
    hero: [62747, 98],
    text: [
      'The Dieulafoys left Paris early in 1881 and reached Persia through Constantinople and the Caucasus. For about a year they moved by caravan, from Tabriz to Tehran, Isfahan and Shiraz, then down to the Gulf and up the rivers to Baghdad.',
      'This room holds the pictures of moving through a country: streets and bazaars seen in passing, river banks, gardens, tents in the rain, the marshes of the Karun and the boats of skin and wood that crossed them.',
      'The coasts of the Gulf and of Makran, with Muscat, Aden and the Suez Canal, come mostly from the album Perse 3 and the start of Perse 4, where the couple kept prints from the Sémiramis mission of 1892–94.',
    ],
  },
  {
    id: 'architecture', n: 2, color: '#2c4a85', ink: '#0d1a33',
    title: 'Domes, Bridges and Bazaars',
    subtitle: 'The Islamic architecture of Persia and Mesopotamia',
    hero: [62742, 5],
    text: [
      'Marcel Dieulafoy was an engineer of bridges and roads, and the journey was above all a survey of buildings. The camera stops at the Blue Mosque of Tabriz, the mausoleum of Öljeitü at Soltaniyeh, the Friday mosques of Varamin, Saveh and Kashan, and the squares, palaces and bridges of Isfahan.',
      'Many pages show the same building several times, from far away, then from the courtyard, then in the detail of a tile panel or a mihrab. In a few years these prints would become the engravings of Jane’s book, La Perse, la Chaldée et la Susiane (1887).',
    ],
  },
  {
    id: 'ancient', n: 3, color: '#a3462c', ink: '#2e0f06',
    title: 'Ancient Empires',
    subtitle: 'Achaemenid, Sasanian and Elamite remains',
    hero: [62742, 45],
    text: [
      'At Pasargadae, Persepolis and Naqsh-e Rustam the couple photographed the monuments of the Achaemenid kings: the tomb of Cyrus, the Gate of All Nations, the rock-cut tombs of Darius and his successors and their inscriptions, line by line.',
      'Further on are the Sasanian palaces of Sarvestan and Firuzabad, the arch of Ctesiphon, the rock reliefs of Bishapur and Naqsh-e Rajab, and the Elamite reliefs of Malamir (Izeh), photographed for the Dieulafoys by Babin and Houssay. Marcel drew on this material for L’Art antique de la Perse (1884–89).',
    ],
  },
  {
    id: 'susa', n: 4, color: '#16736c', ink: '#032421',
    title: 'Susa',
    subtitle: 'The excavation, the friezes and the Louvre',
    hero: [62754, 43],
    text: [
      'In 1884 the French government sent the Dieulafoys to dig the great mound of Susa in Khuzestan. Over two seasons, with Lur and Arab workers and two young assistants, they cut trenches into the tumuli, found the palace of Artaxerxes II and lifted, brick by brick, the glazed friezes of archers and lions.',
      'The albums follow the work from the camp and the trenches to the crates carried down the valley, and then to Paris, where the reassembled friezes, a column capital and the small finds were shown at the Louvre in the Dieulafoy rooms. Jane told the story in her journal, À Suse (1888).',
    ],
  },
  {
    id: 'people', n: 5, color: '#6c3a62', ink: '#230d1f',
    title: 'Faces and Encounters',
    subtitle: 'Portraits from the road and from the camp',
    hero: [62745, 63],
    text: [
      'The Qajar court sits for the camera here, Naser al-Din Shah, his son the Zell-e Soltan and their officials, next to dervishes, merchants, Armenian families of New Julfa, governors of Arabistan and the Lur and Arab men and women who worked at Susa.',
      'Some portraits are careful studio pieces collected along the way; others were taken quickly in a courtyard or in front of a tent. The Dieulafoys are in this room too: Jane reading under a shelter at Susa, Marcel at the end of the excavations, and the two of them on the deck of a steamer.',
    ],
  },
  {
    id: 'elsewhere', n: 6, color: '#55613b', ink: '#1a1f0d',
    title: 'Beyond Persia',
    subtitle: 'Spain, Portugal, France and the museums',
    hero: [62737, 72],
    text: [
      'After Persia the Dieulafoys turned to Spain and Portugal, where they travelled for years and wrote on art, history and architecture. Their album Espagne et Portugal is arranged by town in alphabetical order, from Astorga to Zamora, and then Porto: churches, cloisters, bridges, walls and streets, some prints coloured with gouache.',
      'The album Divers closes the museum. It brings together Assyrian reliefs from Nineveh, among them the battle of the Ulai against Elam, Greek, Egyptian and Mexican antiquities, and France, from the cathedral of Albi to the beach at Andernos and the ruins of Reims and Arras in the First World War.',
    ],
  },
];

// One short note per album for the catalogue. Makers follow the INHA records.
export const ALBUM_NOTES = {
  62746: { makers: 'Jane and Marcel Dieulafoy', text: 'From Constantinople and the Caucasus to Tabriz, Qazvin, Tehran, Varamin, Qom, Kashan and Isfahan. Prints numbered 1 to 201, with panoramas and portraits.' },
  62742: { makers: 'Jane and Marcel Dieulafoy', text: 'The bridges and Armenian quarter of Isfahan, then Pasargadae, Persepolis, Naqsh-e Rustam, Shiraz, Sarvestan and Firuzabad. Contains a portrait of Jane Dieulafoy.' },
  62745: { makers: 'Jane and Marcel Dieulafoy; Louis Lapicque', text: 'The Gulf, Basra, Ctesiphon, Baghdad and Babylon; with prints from the Sémiramis mission (1892–94) to Aden, Muscat and the Makran coast.' },
  62743: { makers: 'Jane and Marcel Dieulafoy; Louis Lapicque', text: 'The Makran coast and Bandar Abbas, then Dezful, Shushtar and the arrival at Susa. Lent to the Musée de l’Orangerie in 2015 for “Qui a peur des femmes photographes ?”.' },
  62747: { makers: 'Jane and Marcel Dieulafoy', text: 'The excavation of Susa: trenches, finds, workers, dancers and musicians, the crates leaving the site, and the palace of Eyvan-e Karkheh.' },
  62754: { makers: 'Jane and Marcel Dieulafoy; Charles Babin; Frédéric Houssay', text: 'Malamir and Bishapur, then the friezes and finds of Susa and their display in the Dieulafoy rooms of the Louvre. Contains a portrait of Marcel Dieulafoy smoking a qalyan.' },
  62737: { makers: 'Jane and Marcel Dieulafoy', text: 'Monuments of Spain and Portugal, arranged alphabetically by town, with captions in ink under the prints; some coloured with gouache.' },
  62750: { makers: 'Jane and Marcel Dieulafoy; W. A. Mansell; Neurdein frères; Alfred Briquet', text: 'Works of art and monuments of Belgium, Egypt, France, Mexico and Persia, and Assyrian reliefs in the British Museum and the Louvre. Probably the couple’s personal album.' },
};
