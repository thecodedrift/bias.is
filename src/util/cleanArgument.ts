export const cleanArgument = (text: string) => {
  
  return text
    // remove quotes on beginning and end
    .replace(/^"(.*)"$/, "$1")
    .trim();
};