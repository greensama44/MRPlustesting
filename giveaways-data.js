/* Mega Rewards giveaways: the single list every page reads.
   Edit giveaways here only. Each draw has a fixed date (Adelaide time).
   status: 'open' | 'up' (upcoming) | 'done'. An open draw whose date has passed is shown as completed automatically.
   cat: 'every' (everyday savings) | 'motor' (motorsport) | 'basket' (basketball)
   photo: your own picture in MR Imagery (used first). img: Unsplash id, used only if photo is missing. daily: true for a draw that runs every day at 6pm. */
window.MR_GIVEAWAYS = [
  { name: 'Mega Daily', photo: 'MR Imagery/imgi_19_816156914_18149424064531058_5733850366501496747_n.jpg', type: 'Cash', cat: 'every', prize: '10 × $100, every day', img: '1527269534026-c86f4009eace', status: 'open', daily: true, feature: true },
  { name: 'Mega Friday: $500 Supercheap Auto voucher', photo: 'MR Imagery/761414275_1997172991002570_5929900211432828186_n.jpeg', type: 'Voucher', cat: 'every', prize: '$500 voucher', img: '1560692830-04adc2f31119', status: 'open', draw: '2026-10-30T18:00:00+10:30' },
  { name: 'Mega Fuel Upgrade', photo: 'MR Imagery/845535936_2217837819101466_7456127702276857981_n.jpg', type: 'Voucher', cat: 'every', prize: '4 × $100 fuel vouchers', img: '1557775692-91fa57f514a6', status: 'open', draw: '2026-11-03T18:00:00+10:30' },
  { name: 'Foot Locker Voucher Upgrade', photo: 'MR Imagery/834876140_1061479960095584_1057156666856647934_n.jpeg', type: 'Voucher', cat: 'every', prize: '2 × $250 vouchers', img: '1610229452706-666ac2d49c45', status: 'open', draw: '2026-11-08T18:00:00+10:30' },
  { name: 'Mega Grocery Saving', photo: 'MR Imagery/woman-choosing-earphones-store.jpg', type: 'Voucher', cat: 'every', prize: '2 × $250 grocery vouchers', img: '1561715276-a2d087060f1d', status: 'open', draw: '2026-11-12T18:00:00+10:30' },
  { name: 'Mega Shot for Cash', photo: 'MR Imagery/854695626_1347880257265112_1624326729454131293_n.jpeg', type: 'Cash', cat: 'basket', prize: 'Up to $50,000', img: '1545525201-e1a5a2a18293', status: 'open', draw: '2026-11-14T18:00:00+10:30', feature: true },
  { name: 'Tickford Racing Experience, Super1000 Bathurst', photo: 'MR Imagery/841324273_2217837739101474_2294785622405291990_n.jpg', type: 'Experience', cat: 'motor', prize: 'Pit garage and tour', img: '1690984651796-6bbb102fbf30', status: 'open', draw: '2026-11-17T18:00:00+10:30' },
  { name: 'VIP Game-Day Experience', photo: 'MR Imagery/837659076_864033240069937_3112578624994998920_n.jpeg', type: 'Experience', cat: 'basket', prize: '4 winners', img: '1629217855633-79a6925d6c47', status: 'open', draw: '2026-11-23T18:00:00+10:30', feature: true },
  { name: 'bp Adelaide Grand Final Experience', photo: 'MR Imagery/840764178_1885415985961478_4658857856626210920_n.jpeg', type: 'Experience', cat: 'motor', prize: 'Track access for 2', img: '1690984651796-6bbb102fbf30', status: 'open', draw: '2026-11-30T18:00:00+10:30', feature: true },
  { name: 'Experience Supercars at the Bathurst 1000', photo: 'MR Imagery/843606098_1627770142187074_2718068516275307701_n.jpeg', type: 'Experience', cat: 'motor', prize: '10 winners', img: '1557775692-91fa57f514a6', status: 'up', draw: '2026-12-09T18:00:00+10:30' },
  { name: 'NBL Finals Courtside Night', photo: 'MR Imagery/833945409_1853873659082122_5674459995087397811_n.jpeg', type: 'Experience', cat: 'basket', prize: 'Courtside for two', img: '1629217855633-79a6925d6c47', status: 'up', draw: '2026-12-24T18:00:00+10:30' },
  { name: 'Bendigo Blitz $500 daily prize', photo: 'MR Imagery/843884097_18636839272031851_9043428050451248141_n.jpg', type: 'Cash', cat: 'every', prize: '$500 daily prize', img: '1503266980949-bd30d04d0b7a', status: 'done', draw: '2026-10-17T18:00:00+10:30' }
];

/* Helpers shared by every page */
window.MRG = (function () {
  const L = () => window.MR_GIVEAWAYS || [];
  const when = g => g.daily ? Date.now() : Date.parse(g.draw);
  const state = g => (g.status === 'open' && !g.daily && when(g) < Date.now()) ? 'done' : g.status;
  const by = s => L().filter(g => state(g) === s).sort((a, b) => when(a) - when(b));
  const img = (g, w) => g.photo ? encodeURI(g.photo) : `https://images.unsplash.com/photo-${g.img}?auto=format&fit=crop&q=75&w=${w || 800}`;
  const date = g => g.daily ? 'Drawn daily, 6pm' : new Date(g.draw).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Australia/Adelaide' });
  const left = g => {
    if (g.daily) return 'Today, 6pm';
    const d = Math.ceil((when(g) - Date.now()) / 864e5);
    return d <= 0 ? 'Drawn' : d === 1 ? 'Draws tomorrow' : `Draws in ${d} days`;
  };
  return { all: L, state, by, open: () => by('open'), upcoming: () => by('up'), done: () => by('done'), img, date, left };
})();
