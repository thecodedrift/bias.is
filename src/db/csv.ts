import artists from "../../db/artists.json" with { type: "json" };

type Artist = {
  name: string;
  hangul: string;
  "solo/group": "solo" | "group";
  "full name (if solo)": string;
  "fanclub name": string;
};

const allowedArtists = (artists as Artist[]).filter((a) => {
  // don't allow artists with a + in the hangul name, as these are collabs
  if (a.hangul.includes("+")) return false;

  return true;
});

export const getInstance = async () => {
  // read the CSV file
  return allowedArtists;
};
