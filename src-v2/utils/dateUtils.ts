import dayjs from 'dayjs';

export type ExpiryOption = 'a-day' | '3-days' | '5-days' | 'a-week';

export const calculateExpiryDate = (option: ExpiryOption): Date => {
  const today = dayjs().startOf('day');

  switch (option) {
    case 'a-day':
      return today.add(1, 'day').toDate(); // Tomorrow
    case '3-days':
      return today.add(3, 'day').toDate(); // 3 days from today
    case '5-days':
      return today.add(5, 'day').toDate(); // 5 days from today
    case 'a-week':
      return today.add(7, 'day').toDate(); // 7 days from today
    default:
      return today.add(3, 'day').toDate(); // Default to 3 days
  }
};
