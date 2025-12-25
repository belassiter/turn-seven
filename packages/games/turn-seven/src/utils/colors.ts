export const getPlayerColor = (name: string, isBot: boolean): string => {
  if (!isBot) return '#000000'; // Human is black (or default)

  // Simple hash to pick a color
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Palette of bot colors (avoiding red/green which have game meanings like Bust/Safe)
  const colors = [
    '#7c3aed', // Violet
    '#2563eb', // Blue
    '#059669', // Emerald
    '#d97706', // Amber
    '#db2777', // Pink
    '#4b5563', // Gray
    '#0891b2', // Cyan
    '#9333ea', // Purple
  ];

  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

export const getDifficultyColor = (difficulty?: string) => {
  switch (difficulty) {
    case 'easy':
      return 'green';
    case 'medium':
      return '#eab308'; // yellow-500
    case 'hard':
      return 'orange';
    case 'omg':
      return 'darkred';
    case 'omniscient':
      return '#ec4899'; // pink-500
    default:
      return undefined;
  }
};
