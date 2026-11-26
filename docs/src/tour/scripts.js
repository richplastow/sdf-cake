/** #### The captions of the presentation cakes, one script per page
 * - From sections 2 to 8 of the Cake Day notes, `20261126-cake-day.md` at
 *   the repo root, in tour order: every `presentation` page but `#5`.
 * - Each script is its page's `pageId`, the section's `title`, shown above
 *   every beat, and its `beats`. A beat is a slider position, its
 *   `eaten` step and `reveal` stop, and one short chunk of the section's
 *   `text`: plain text, with curly quotes and no markup.
 * - Beats follow the sliders' natural path: each beat's `eaten` and
 *   `reveal` are each at least the previous beat's, and one is greater.
 *   The first beat is at `(0, 0)`, and the last at the top reveal stop and
 *   the last eaten step. A chunk that first names a part the reveal brings
 *   in, such as the honey or the candles, sits at that part's stop.
 * - Pure data: Node can read it.
 */
export const SCRIPTS = [
  {
    pageId: "pancake",
    title: "Intro",
    beats: [
      {
        eaten: 0,
        reveal: 0,
        text:
          "The word ‘cake’ comes from the Old Norse kaka. " +
          "But nobody’s really sure where that word comes from.",
      },
      {
        eaten: 0,
        reveal: 1,
        text:
          "For the first few hundred years, a cake was just bread " +
          "that you’d flipped over.",
      },
      { eaten: 1, reveal: 1, text: "Bread stayed the right way up." },
      {
        eaten: 2,
        reveal: 1,
        text: "If you turned it over on the hearthstone, it was a cake.",
      },
      {
        eaten: 4,
        reveal: 1,
        text:
          "So basically, pancakes were a typical ancient British " +
          "breakfast.",
      },
    ],
  },
  {
    pageId: "pepionkh-honey-cake",
    title: "Ancient Egypt",
    beats: [
      {
        eaten: 0,
        reveal: 0,
        text:
          "The world’s oldest surviving cake is Egyptian, " +
          "and more than 4,000 years old.",
      },
      {
        eaten: 0,
        reveal: 1,
        text:
          "It was found in 1913 in the tomb of a vizier called " +
          "Pepi’Onkh, and would fit nicely in the palm of your hand.",
      },
      {
        eaten: 0,
        reveal: 2,
        text: "It’s two wheat flatbreads, filled with honey,",
      },
      { eaten: 0, reveal: 5, text: "with sesame seeds on top." },
      {
        eaten: 1,
        reveal: 5,
        text: "It was baked between two tight-fitting copper moulds,",
      },
      {
        eaten: 2,
        reveal: 5,
        text:
          "and as it cooled, the escaping air formed a vacuum seal, " +
          "which is why it survived four thousand years.",
      },
      {
        eaten: 3,
        reveal: 5,
        text:
          "You can go and see it today. " +
          "It’s in a food museum in Switzerland.",
      },
    ],
  },
  {
    pageId: "artemis-offering",
    title: "Offerings to the gods",
    beats: [
      {
        eaten: 0,
        reveal: 0,
        text:
          "The Ancient Greeks gave the world the important " +
          "innovation of…",
      },
      { eaten: 0, reveal: 8, text: "…putting candles on cakes." },
      { eaten: 1, reveal: 8, text: "But it wasn’t for birthdays." },
      {
        eaten: 2,
        reveal: 8,
        text: "Once a month they offered round cakes covered with candles",
      },
      {
        eaten: 4,
        reveal: 8,
        text: "to Artemis, the goddess of the moon.",
      },
    ],
  },
  {
    pageId: "sachertorte",
    title: "Cake wars",
    beats: [
      {
        eaten: 0,
        reveal: 0,
        text:
          "In 1832 in Vienna, a 16-year-old apprentice called Franz " +
          "Sacher had to improvise a dessert.",
      },
      {
        eaten: 0,
        reveal: 1,
        text:
          "He invented The Sachertorte. Later came a legal battle over " +
          "the name “The Original Sachertorte”.",
      },
      {
        eaten: 0,
        reveal: 2,
        text:
          "The 1963 settlement: Hotel Sacher gets two layers of " +
          "apricot jam",
      },
      {
        eaten: 0,
        reveal: 6,
        text:
          "and a round chocolate seal. Demel gets one layer of jam " +
          "and a triangular seal.",
      },
      {
        eaten: 1,
        reveal: 6,
        text:
          "Back in 1832, Prince Metternich’s head chef had fallen ill " +
          "just before an important dinner.",
      },
      {
        eaten: 2,
        reveal: 6,
        text:
          "A century later, Hotel Sacher went bankrupt, and Sacher’s " +
          "son joined the rival confectioner Demel.",
      },
      {
        eaten: 3,
        reveal: 6,
        text:
          "The legal battle went on so long it’s known as the " +
          "Sweet Seven Years’ War.",
      },
      {
        eaten: 4,
        reveal: 6,
        text:
          "Hotel Sacher still makes 360,000 tortes a year, by hand. " +
          "They say never put it in the fridge, and that it fits in " +
          "cabin luggage.",
      },
    ],
  },
  {
    pageId: "bolo-formigueiro",
    title: "Anthill Cake",
    beats: [
      {
        eaten: 0,
        reveal: 0,
        text: "Anthill Cake (Brazil, Bolo Formigueiro):",
      },
      {
        eaten: 0,
        reveal: 3,
        text: "a sponge full of chocolate sprinkles,",
      },
      { eaten: 1, reveal: 3, text: "so every slice looks like" },
      { eaten: 4, reveal: 3, text: "it’s swarming with ants." },
    ],
  },
  {
    pageId: "banh-bo",
    title: "Cow Cake",
    beats: [
      { eaten: 0, reveal: 0, text: "Cow Cake (Vietnam, Bánh Bò):" },
      { eaten: 0, reveal: 1, text: "a pandan and coconut sponge," },
      {
        eaten: 1,
        reveal: 3,
        text: "named because the honeycomb sponge",
      },
      {
        eaten: 4,
        reveal: 3,
        text: "looks like the lining of a cow’s stomach.",
      },
    ],
  },
  {
    pageId: "custard-pie",
    title: "Jokes",
    beats: [
      {
        eaten: 0,
        reveal: 0,
        text: "Tim Vine: “I’ve got a sponge front door.”",
      },
      { eaten: 0, reveal: 1, text: "“Hey, don’t knock it.”" },
      {
        eaten: 0,
        reveal: 3,
        text: "Tim Vine: “I got food poisoning off an Italian dessert.”",
      },
      {
        eaten: 0,
        reveal: 4,
        text: "“I’ve a good mind to tiramisu the company.”",
      },
      {
        eaten: 2,
        reveal: 4,
        text:
          "Tim Vine: “I went down my local cake shop, and said " +
          "‘I want you to make me a birthday cake’. " +
          "He said ‘Hundreds & thousands?’”",
      },
      {
        eaten: 3,
        reveal: 4,
        text: "“I said ‘We’ll start with one.’”",
      },
    ],
  },
];
