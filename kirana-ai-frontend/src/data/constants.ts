import { ProductCategory } from '../types/retail';

// Static UI configuration (not sample data).
export const CATEGORIES: ProductCategory[] = [
  'Flour & Rice',
  'Biscuits & Snacks',
  'Oils & Ghee',
  'Masala & Spices',
  'Dairy',
  'Personal Care',
  'Beverages',
  'Dals & Pulses',
  'Sugar & Salt',
];

export const SUGGESTED_COMMANDS = [
  {
    id: 'cmd-1',
    label: 'Show low-stock items',
    tamil: 'குறைந்த ஸ்டாக் பார்க்க',
    prompt: 'Show low-stock items',
    description: 'Check inventory running low or out of stock',
  },
  {
    id: 'cmd-2',
    label: "Today's sales summary",
    tamil: 'இன்றைய விற்பனை நிலவரம்',
    prompt: "Today's sales summary",
    description: 'Revenue, bill count, and cash vs UPI total',
  },
  {
    id: 'cmd-3',
    label: 'Find a product price',
    tamil: 'பொருள் விலை பார்க்க',
    prompt: 'Find a product price',
    description: 'Look up retail prices for atta, oil, sugar, or tea',
  },
  {
    id: 'cmd-4',
    label: 'Add a new product',
    tamil: 'புதிய பொருள் சேர்க்க',
    prompt: 'Add a new product',
    description: 'Quickly register new stock into inventory',
  },
  {
    id: 'cmd-5',
    label: 'Which items sold most this week?',
    tamil: 'அதிகம் விற்ற பொருட்கள்',
    prompt: 'Which items sold most this week?',
    description: 'See highest volume fast-moving staples',
  },
  {
    id: 'cmd-6',
    label: 'Show credit customers',
    tamil: 'கடன் வாடிக்கையாளர் விபரம்',
    prompt: 'Show credit customers',
    description: 'View outstanding Kadai Khata balances',
  },
];

export const QUERY_EXAMPLES = [
  "Today's sales",
  'Low stock items',
  'Add sugar 5kg',
  'Top selling products',
];
