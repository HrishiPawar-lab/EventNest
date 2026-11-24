export type EventCategory = 'Music' | 'Food' | 'Arts' | 'Sports' | 'Technology' | 'Workshops'

export type Event = {
  id: string
  title: string
  category: string
  city: string
  venue: string
  date: string
  time: string
  price: number
  image?: string
  organizer: string
  description: string
  highlights: string[]
}

// Presentation data only. These events are not published inventory.
export const sampleEvents: Event[] = [
  {
    id: 'afterglow-live',
    title: 'Afterglow Live',
    category: 'Music',
    city: 'Mumbai',
    venue: 'Harbour Arena',
    date: '2027-02-20',
    time: '7:00 PM',
    price: 2499,
    image: '/images/concert.jpg',
    organizer: 'Good Nights Collective',
    description:
      'A full evening of live music, luminous sets, and the kind of crowd that sings every chorus together.',
    highlights: ['Live performances', 'Food and drinks', 'Open floor admission'],
  },
  {
    id: 'makers-summit',
    title: 'Makers Summit 2027',
    category: 'Technology',
    city: 'Bengaluru',
    venue: 'The Forum',
    date: '2027-03-06',
    time: '9:30 AM',
    price: 1899,
    image: '/images/conference.jpg',
    organizer: 'Makers Guild',
    description:
      'Ideas, conversations, and practical lessons from people building the next wave of useful technology.',
    highlights: ['Talks and panels', 'Community networking', 'Hands-on sessions'],
  },
  {
    id: 'street-food-social',
    title: 'Street Food Social',
    category: 'Food',
    city: 'Delhi',
    venue: 'Old Mill Grounds',
    date: '2027-03-13',
    time: '12:00 PM',
    price: 499,
    image: '/images/food.jpg',
    organizer: 'The Table Project',
    description:
      'A day spent tasting familiar favorites and new discoveries from independent cooks and neighborhood kitchens.',
    highlights: ['Local food stalls', 'Chef demonstrations', 'Family-friendly setting'],
  },
  {
    id: 'art-in-motion',
    title: 'Art in Motion',
    category: 'Arts',
    city: 'Mumbai',
    venue: 'South Gallery',
    date: '2027-03-21',
    time: '11:00 AM',
    price: 699,
    image: '/images/art.jpg',
    organizer: 'Open Canvas',
    description:
      'Explore contemporary work from emerging artists, then meet the people and stories behind the pieces.',
    highlights: ['Curated exhibition', 'Artist conversations', 'Guided gallery walk'],
  },
  {
    id: 'city-derby',
    title: 'The City Derby',
    category: 'Sports',
    city: 'Bengaluru',
    venue: 'Central Stadium',
    date: '2027-04-03',
    time: '6:30 PM',
    price: 999,
    image: '/images/sports.jpg',
    organizer: 'City Sport Live',
    description:
      'Big-match atmosphere, a packed stand, and ninety minutes to remember with fellow supporters.',
    highlights: ['Live match', 'General admission', 'Food concourse'],
  },
  {
    id: 'weekend-workshop',
    title: 'Weekend Workshop',
    category: 'Workshops',
    city: 'Pune',
    venue: 'The Commons',
    date: '2027-04-10',
    time: '10:00 AM',
    price: 1299,
    image: '/images/workshop.jpg',
    organizer: 'Makers Guild',
    description:
      'Learn something new in good company through a practical workshop made for curious beginners.',
    highlights: ['Small-group learning', 'Materials included', 'Take-home guide'],
  },
  {
    id: 'night-shift-sessions',
    title: 'Night Shift Sessions',
    category: 'Music',
    city: 'Hyderabad',
    venue: 'Warehouse 8',
    date: '2027-04-24',
    time: '8:00 PM',
    price: 899,
    image: '/images/stage.jpg',
    organizer: 'Good Nights Collective',
    description:
      'An intimate night of live bands, new sounds and familiar faces in a space built for music.',
    highlights: ['Live local bands', 'Open floor admission', 'Late-night food'],
  },
  {
    id: 'jazz-by-the-bay',
    title: 'Jazz by the Bay',
    category: 'Music',
    city: 'Mumbai',
    venue: 'The Blue Room',
    date: '2027-05-01',
    time: '7:30 PM',
    price: 1199,
    image: '/images/jazz.jpg',
    organizer: 'Blue Hour Sessions',
    description: 'A relaxed evening of live jazz, warm lights and good company by the waterfront.',
    highlights: ['Live jazz ensemble', 'Intimate setting', 'General admission'],
  },
]

export const categories: EventCategory[] = [
  'Music',
  'Food',
  'Arts',
  'Sports',
  'Technology',
  'Workshops',
]

export const formatPrice = (price: number) => `₹${price.toLocaleString('en-IN')}`
export const eventById = (id: string | undefined) => sampleEvents.find((event) => event.id === id)
export const eventDate = (date: string) =>
  new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(date.includes('T') ? date : `${date}T12:00:00+05:30`))
