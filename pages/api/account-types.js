
export default function handler(req, res) {
  if (req.method === 'GET') {
    const accountTypes = [
      {
        id: '1',
        name: 'Checking Account',
        description: 'For everyday banking needs',
        features: ['No minimum balance', 'Free online banking', 'Debit card included']
      },
      {
        id: '2',
        name: 'Savings Account',
        description: 'Earn interest on your savings',
        features: ['Competitive interest rates', 'No monthly fees', 'Online access']
      },
      {
        id: '3',
        name: 'Business Account',
        description: 'Banking solutions for businesses',
        features: ['Business debit card', 'Online business banking', 'Mobile deposits']
      },
      {
        id: '4',
        name: 'Investment Account',
        description: 'Grow your wealth with investments',
        features: ['Stock trading', 'Mutual funds', 'Retirement planning']
      },
      {
        id: '5',
        name: 'Student Account',
        description: 'Banking for students',
        features: ['No monthly fees', 'Student benefits', 'Online banking']
      },
      {
        id: '6',
        name: 'Premium Account',
        description: 'Premium banking experience',
        features: ['Priority support', 'Higher limits', 'Premium rewards']
      }
    ];
    
    res.status(200).json(accountTypes);
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
