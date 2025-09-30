# System Architecture Diagrams

## High-Level Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│                        USER INTERFACE                            │
│                                                                  │
│  ┌────────────────┐              ┌────────────────┐             │
│  │ PredictionCard │              │ PredictionCard │             │
│  │                │              │    Details     │             │
│  │  [Image]       │   ---------> │                │             │
│  │  Title         │   Navigate   │  [Same Image]  │             │
│  │  Description   │              │  Full content  │             │
│  └────────┬───────┘              └────────┬───────┘             │
│           │                               │                     │
│           └───────────┬───────────────────┘                     │
│                       │                                         │
│                       │ usePredictionMedia({id, title, cat})   │
│                       ▼                                         │
└──────────────────────────────────────────────────────────────────┘
                        │
                        │
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│                   CACHING LAYER (Hook Logic)                     │
│                                                                  │
│  Step 1: Check Memory Cache                                     │
│  ┌─────────────────────────────────────┐                        │
│  │ Map<predictionId, imageUrl>         │                        │
│  │                                     │                        │
│  │ Hit? ──> Return immediately (10ms)  │                        │
│  │ Miss? ──> Continue to Step 2        │                        │
│  └─────────────────────────────────────┘                        │
│           │                                                     │
│           ▼                                                     │
│  Step 2: Check Supabase Cache                                   │
│  ┌─────────────────────────────────────┐                        │
│  │ SELECT FROM prediction_media        │                        │
│  │ WHERE prediction_id = ?             │                        │
│  │                                     │                        │
│  │ Hit? ──> Store in memory, return    │ (50-100ms)             │
│  │ Miss? ──> Continue to Step 3        │                        │
│  └─────────────────────────────────────┘                        │
│           │                                                     │
│           ▼                                                     │
│  Step 3: Build Smart Query                                      │
│  ┌─────────────────────────────────────┐                        │
│  │ buildImageQuery(title, category)    │                        │
│  │                                     │                        │
│  │ • Apply brand rules                 │                        │
│  │ • Add category hints                │                        │
│  │ • Remove stop words                 │                        │
│  │ • Generate optimized query          │                        │
│  └─────────────────────────────────────┘                        │
│           │                                                     │
│           ▼                                                     │
│  Step 4: Fetch via Proxy                                        │
│  ┌─────────────────────────────────────┐                        │
│  │ GET /media/search?q={query}         │                        │
│  │                                     │                        │
│  │ Returns: { images: [{ url }] }      │ (300-500ms)            │
│  └─────────────────────────────────────┘                        │
│           │                                                     │
│           ▼                                                     │
│  Step 5: Store & Return                                         │
│  ┌─────────────────────────────────────┐                        │
│  │ • Save to Supabase                  │                        │
│  │ • Cache in memory                   │                        │
│  │ • Return URL to component           │                        │
│  └─────────────────────────────────────┘                        │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│                    EXTERNAL SERVICES                             │
│                                                                  │
│  ┌────────────────┐         ┌────────────────┐                  │
│  │    Supabase    │         │  /media/search │                  │
│  │                │         │     Proxy      │                  │
│  │  - Auth        │         │                │                  │
│  │  - Database    │         │ ┌────────────┐ │                  │
│  │  - RLS         │         │ │  Pexels    │ │                  │
│  │                │         │ │  Unsplash  │ │                  │
│  └────────────────┘         │ └────────────┘ │                  │
│                             └────────────────┘                  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

## Query Building Flow

```
User Input: "Will Apple announce a foldable iPhone by 2025?"
Category: "tech"
                        │
                        ▼
┌──────────────────────────────────────────────────────────────────┐
│                     buildImageQuery()                            │
└──────────────────────────────────────────────────────────────────┘
                        │
        ┌───────────────┴───────────────┐
        │                               │
        ▼                               ▼
┌──────────────────┐          ┌──────────────────┐
│ Normalize Text   │          │ Check Brand      │
│                  │          │ Rules            │
│ "will apple...?" │          │                  │
│       ▼          │          │ Match: /apple/   │
│ "will apple..."  │          │ + /(iphone|ios)/ │
│       ▼          │          │       ▼          │
│ lowercase        │          │ Apply Rule:      │
│ remove special   │          │ "iPhone product" │
│       ▼          │          │ + "apple"        │
│ "will apple..."  │          └──────────────────┘
└──────────────────┘                   │
        │                              │
        └──────────────┬───────────────┘
                       ▼
            ┌────────────────────┐
            │ Remove Stop Words  │
            │                    │
            │ "will" ❌         │
            │ "apple" ✅        │
            │ "announce" ❌     │
            │ "foldable" ✅     │
            │ "iphone" ✅       │
            └────────────────────┘
                       │
                       ▼
            ┌────────────────────┐
            │ Apply Synonyms     │
            │                    │
            │ No matches needed  │
            └────────────────────┘
                       │
                       ▼
            ┌────────────────────┐
            │ Limit Words (6)    │
            │                    │
            │ Keep most relevant │
            └────────────────────┘
                       │
                       ▼
            ┌────────────────────┐
            │ Add Category Hint  │
            │                    │
            │ + "technology"     │
            │ + "smartphone"     │
            │ + "gadget"         │
            └────────────────────┘
                       │
                       ▼
            ┌────────────────────┐
            │ Final Query        │
            │                    │
            │ "iPhone smartphone │
            │  product shot      │
            │  modern apple"     │
            └────────────────────┘
```

## Component Integration Pattern

```
┌─────────────────────────────────────────────────────────────────┐
│                      Before (Old System)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  function PredictionCard({ prediction }) {                      │
│    const [imageUrl, setImageUrl] = useState(null);              │
│                                                                 │
│    useEffect(() => {                                            │
│      // Complex logic to fetch image                            │
│      fetchImageFromAPI(prediction.title)                        │
│        .then(url => setImageUrl(url));                          │
│    }, [prediction.title]);                                      │
│                                                                 │
│    return <img src={imageUrl || fallback} />                    │
│  }                                                              │
│                                                                 │
│  function PredictionDetails({ prediction }) {                   │
│    const [imageUrl, setImageUrl] = useState(null);              │
│                                                                 │
│    useEffect(() => {                                            │
│      // Same logic duplicated ❌                                │
│      // But might return DIFFERENT image! ❌                    │
│      fetchImageFromAPI(prediction.title)                        │
│        .then(url => setImageUrl(url));                          │
│    }, [prediction.title]);                                      │
│                                                                 │
│    return <img src={imageUrl || fallback} />                    │
│  }                                                              │
│                                                                 │
│  Problems:                                                      │
│  ❌ Duplicated logic                                            │
│  ❌ Card and Details may show different images                  │
│  ❌ No caching across components                                │
│  ❌ Multiple API calls for same prediction                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                       After (New System)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  function PredictionCard({ prediction }) {                      │
│    const imageUrl = usePredictionMedia({                        │
│      id: prediction.id,                                         │
│      title: prediction.title,                                   │
│      category: prediction.categorySlug                          │
│    });                                                          │
│                                                                 │
│    return <img src={imageUrl || fallback} />                    │
│  }                                                              │
│                                                                 │
│  function PredictionDetails({ prediction }) {                   │
│    const imageUrl = usePredictionMedia({                        │
│      id: prediction.id,        // Same ID                       │
│      title: prediction.title,  // Same title                    │
│      category: prediction.categorySlug                          │
│    });                                                          │
│                                                                 │
│    return <img src={imageUrl || fallback} />                    │
│  }                                                              │
│                                                                 │
│  Benefits:                                                      │
│  ✅ Single line of code                                         │
│  ✅ Card and Details ALWAYS show same image                     │
│  ✅ Automatic caching (memory + DB)                             │
│  ✅ Only 1 API call per prediction (ever!)                      │
│  ✅ Works across devices/sessions                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Cache Performance Comparison

```
Scenario: User views prediction "Will Bitcoin hit $100k?"

┌─────────────────────────────────────────────────────────────────┐
│                    First Time (Cache Miss)                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Check memory      ────────────── 0ms (miss)                 │
│  2. Check Supabase    ───────────── 50ms (miss)                 │
│  3. Build query       ────────────── 1ms                        │
│  4. Fetch via proxy   ────────────── 300ms                      │
│  5. Store in DB       ───────────── 20ms                        │
│  6. Cache in memory   ────────────── 0ms                        │
│                                    ─────                        │
│  Total Time:                        371ms                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│              Second View (Same Session - Memory Hit)            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Check memory      ────────────── 10ms ✅ HIT!               │
│                                                                 │
│  Total Time:                        10ms (97% faster!)          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│           Different Device/Session (Supabase Hit)               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Check memory      ────────────── 0ms (miss - new session)   │
│  2. Check Supabase    ──────────────  80ms ✅ HIT!              │
│  3. Cache in memory   ────────────── 0ms                        │
│                                    ─────                        │
│  Total Time:                        80ms (78% faster!)          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow: Create Prediction → View Prediction

```
Step 1: User Creates Prediction
┌─────────────────────────────────────┐
│ User: "Will Bitcoin hit $100k?"    │
│ Category: crypto                   │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│ Supabase: predictions table        │
│                                    │
│ INSERT {                           │
│   id: "abc-123"                    │
│   title: "Will Bitcoin..."         │
│   categorySlug: "crypto"           │
│ }                                  │
└─────────────────────────────────────┘

Step 2: Prediction Card Renders
┌─────────────────────────────────────┐
│ Component calls:                   │
│                                    │
│ usePredictionMedia({               │
│   id: "abc-123",                   │
│   title: "Will Bitcoin...",        │
│   category: "crypto"               │
│ })                                 │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│ Hook Logic:                        │
│                                    │
│ 1. memory.get("abc-123") → null    │
│ 2. supabase.select(...) → null     │
│ 3. buildImageQuery() →             │
│    "bitcoin cryptocurrency"        │
│ 4. fetch("/media/search") →        │
│    { url: "bitcoin-img.jpg" }      │
│ 5. Store in DB + memory            │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│ Supabase: prediction_media table   │
│                                    │
│ INSERT {                           │
│   prediction_id: "abc-123"         │
│   image_url: "bitcoin-img.jpg"     │
│   query: "bitcoin cryptocurrency"  │
│   source: "pexels"                 │
│ }                                  │
└─────────────────────────────────────┘

Step 3: User Navigates to Details
┌─────────────────────────────────────┐
│ usePredictionMedia({               │
│   id: "abc-123",    ← Same ID!     │
│   title: "...",                    │
│   category: "crypto"               │
│ })                                 │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│ Hook Logic:                        │
│                                    │
│ 1. memory.get("abc-123") →         │
│    ✅ "bitcoin-img.jpg" (10ms)      │
│                                    │
│ Return immediately!                │
│ Same image as Card ✅              │
└─────────────────────────────────────┘
```

## Error Handling Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Happy Path (Success)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  usePredictionMedia() → API Success → Store → Return URL       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                 Error: API Returns No Results                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  usePredictionMedia() → API returns [] → Store null → Return null│
│                                                     │            │
│                                                     ▼            │
│                                            Component shows       │
│                                            fallback gradient     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                  Error: Supabase Unavailable                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Check memory → miss                                         │
│  2. Check Supabase → error ❌                                   │
│  3. Skip DB, continue to API                                    │
│  4. Fetch from API → success ✅                                 │
│  5. Try store in DB → error (silent fail)                       │
│  6. Store in memory only → success ✅                           │
│  7. Return URL → Component renders ✅                           │
│                                                                 │
│  Result: Image shows, but not persisted (degrades gracefully)   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                Error: Network/API Completely Down               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Check memory → miss                                         │
│  2. Check Supabase → miss                                       │
│  3. Fetch from API → error ❌                                   │
│  4. Store null in memory                                        │
│  5. Return null → Component shows fallback ✅                   │
│                                                                 │
│  Result: Graceful degradation with fallback UI                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

These diagrams illustrate:
1. **High-level flow** - How components, caching, and services interact
2. **Query building** - Step-by-step query optimization process
3. **Component integration** - Before/after comparison
4. **Cache performance** - Speed improvements from caching
5. **Data flow** - Complete lifecycle of a prediction's image
6. **Error handling** - Graceful degradation strategies
