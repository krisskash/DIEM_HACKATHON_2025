# ecodrop³ - DIEM Hackathon 2025

> *Blockchain-powered delivery service connecting couriers, lockers, and gig workers for eco-friendly last-mile delivery in Athens.*

A decentralized intermediate delivery platform where couriers deliver parcels to smart lockers, and gig workers (Droppers) pick them up to deliver to customers. Built with blockchain technology for transparent, secure payments.

## 🌟 Key Features

- **🔐 Blockchain Security**: Smart contract escrow system for safe payments
- **🔑 MetaMask Authentication**: Web3 wallet-based login with signature verification
- **📍 Smart Locker Network**: 8 strategically located locker hubs across Athens
- **🗺️ Interactive Mapping**: Real-time GPS tracking with Google Maps
- **💰 Transparent Pricing**: €1 base + €1/km (Small), €1.50/km (Medium), €2/km (Large) + 10% platform fee
- **⚡ Crypto Payments**: ETH payments with QR codes on Sepolia Testnet
- **📦 Package Tracking**: Complete job lifecycle from creation to delivery
- **🔒 Privacy First**: SHA256 encryption for customer delivery addresses

## 🛠️ Tech Stack

**Frontend:**
- HTML5, CSS3, Vanilla JavaScript
- Google Maps JavaScript API (Places, Geocoding)
- Leaflet.js for secondary mapping views
- QRCode.js for payment QR generation
- Web3/MetaMask integration

**Backend:**
- Node.js + Express.js REST API
- MongoDB with Mongoose ODM
- JWT authentication + ethers.js signature verification
- "Blockchain integration" (Sepolia Testnet)

**Blockchain:**
- Ethereum (Sepolia Testnet)
- Smart contract escrow system
- CoinGecko API for live ETH pricing

**External APIs:**
- Google Maps JavaScript API (Places, Geocoding, Distance Matrix)
- CoinGecko API (cryptocurrency pricing)
- OpenStreetMap (alternative map tiles)

## 📦 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Setup environment variables
# Create .env file with:
PORT=3000
MONGODB_URI=mongodb://localhost:27017/diem_delivery
JWT_SECRET=your_jwt_secret_here

# 3. Ensure MongoDB is running
# (Use MongoDB Compass or local MongoDB instance)

# 4. Start development server
npm run dev

# 5. Open browser
# Navigate to http://localhost:3000
```

### First Time Setup

1. **Install MetaMask** browser extension
2. **Switch to Sepolia Testnet** in MetaMask
3. **Get test ETH** from [Sepolia Faucet](https://sepoliafaucet.com/)
4. **Sign up** on the platform and connect your wallet

## 🗺️ Smart Locker Network

### Real Locker Locations in Athens

The platform features **real ACS Smartpoint lockers** across Athens, scraped from Google Maps Places API. The database contains actual locker locations with:

- **2000+ verified locker locations** throughout Athens metropolitan area
- Real addresses, coordinates (lat/lng), and place IDs
- User ratings and reviews from Google Maps
- Coverage across all major neighborhoods and districts

### Data Collection Process

We used the **Google Maps Places API** to discover and validate real locker locations:

1. **Search Query**: "ACS Smartpoint locker Athens" 
2. **API Integration**: Google Places API with autocomplete and geocoding
3. **Data Scraping**: Automated collection of locker metadata
4. **Validation**: Verified coordinates, addresses, and availability
5. **Storage**: Stored in MongoDB with `data/lockers.json` backup

### Interactive Map Features

**Powered by Google Maps JavaScript API:**
- 📍 Real-time locker markers with custom icons
- � Search and filter lockers by location
- 📏 Distance calculation from user location
- 🗺️ Interactive map with zoom and pan
- 📌 Click locker markers to view details and select
- 🧭 GPS location services for nearby lockers

## 🔄 How It Works

### For Customers:
1. **Create Order** - Select pickup locker and enter delivery address
2. **Pay with ETH** - Scan QR code, pay on Sepolia Testnet
3. **Track Delivery** - Monitor job status in real-time
4. **Receive Package** - Confirm delivery with verification code

### For Droppers (Gig Workers):
1. **Browse Jobs** - View available deliveries with earnings
2. **Accept Job** - Commit to delivery and get locker access code
3. **Pick Up** - Retrieve package from smart locker
4. **Deliver** - Complete delivery and earn 90% of fees

## � Pricing Model

**Base Fee:** €1 (all packages)

**Distance Multipliers:**
- 📦 **Small** (letters, documents): €1.00/km
- 📫 **Medium** (shoeboxes, up to 2.5kg): €1.50/km (1.5x)
- 📮 **Large** (boxes, 5kg+): €2.00/km (2x)

**Platform Fee:** 10% of subtotal

**Dropper Earnings:** 90% of delivery fee

**Example:**
- Small package, 5km distance
- Calculation: €1 base + (€1 × 5km) = €6
- Platform fee: €0.60
- **Total:** €6.60
- **Dropper earns:** €5.94

## �📝 API Endpoints

### Authentication
- `POST /api/auth/nonce` - Get message to sign with wallet
- `POST /api/auth/login` - Verify signature and authenticate
- `POST /api/auth/register` - Register new user
- `GET /api/auth/me` - Get current user profile

### Jobs
- `GET /api/jobs` - List all jobs (filtered by user)
- `GET /api/jobs/available` - Available jobs for Droppers
- `POST /api/jobs` - Create new delivery job
- `POST /api/jobs/:id/accept` - Accept job (requires gigWorkerName)
- `POST /api/jobs/:id/pickup` - Confirm locker pickup
- `POST /api/jobs/:id/deliver` - Complete delivery
- `POST /api/jobs/:id/pay` - Process payment
- `POST /api/jobs/:id/rate` - Rate Dropper

### Lockers
- `GET /api/lockers` - Get all active locker locations (2000+ real ACS Smartpoints)
- `GET /api/lockers/nearby` - Find lockers near coordinates
- `GET /api/lockers/:id` - Get specific locker details

### Pricing
- `POST /api/pricing/calculate` - Calculate delivery cost
- `GET /api/pricing/rates` - Get current pricing rates

## 🎯 Complete Delivery Flow

```
1. 📦 Courier → Smart Locker
   └─ Courier delivers package to nearest locker
   └─ System generates pickup code

2. 💳 Customer → Payment
   └─ Creates order on platform
   └─ Pays with ETH (QR code)
   └─ Funds held in escrow

3. 👀 Dropper → Browse Jobs
   └─ Views available deliveries
   └─ Sees earnings and distance

4. ✅ Dropper → Accept Job
   └─ Commits to delivery
   └─ Receives locker access code

5. 🔓 Dropper → Pickup
   └─ Opens locker with code
   └─ Confirms pickup in app

6. 🚴 Dropper → Deliver
   └─ Delivers to customer address
   └─ Customer provides confirmation code

7. 💰 Payment Released
   └─ Smart contract releases funds
   └─ Dropper receives 90% of fee
   └─ Platform takes 10%
```

## 🔐 Security & Privacy

**Authentication:**
- 🔑 MetaMask signature verification (ethers.js)
- 🎫 JWT tokens with 7-day expiry
- 🔒 Secure session management

**Data Protection:**
- 🔐 SHA256 encryption for customer PII
- 📍 Address privacy until job accepted
- 🔗 Blockchain transparency for payments

**Verification:**
- 📟 Unique pickup codes for lockers
- 🔢 Delivery confirmation codes
- ⭐ Rating system for accountability

## 🌱 DIEM Hackathon 2025

This project demonstrates the potential of **blockchain technology** to revolutionize everyday services like delivery logistics. Built by a team of 4 students, it showcases:

- ✅ Decentralized payment processing
- ✅ Smart contract escrow systems
- ✅ Fair compensation for gig workers (90% earnings)
- ✅ Transparent, trustless transactions
- ✅ Real-world application of Web3 technology

### Team Focus
Our goal is to create a **fairer, more transparent alternative** to traditional delivery platforms that take large commission cuts. By leveraging blockchain, we ensure payment security and eliminate the need for trust between strangers.

## 📄 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Built for DIEM Hackathon 2025. For questions or collaboration:
- Repository: [github.com/krisskash/DIEM_HACKATHON_2025](https://github.com/krisskash/DIEM_HACKATHON_2025)

---

**Made with 💚 for a greener, fairer delivery future.**
