# Skeleton Components

Skeleton components are used to display loading states throughout the application. They provide a visual placeholder while data is being fetched, enhancing the user experience by reducing perceived loading times.

## Available Components

- **SkeletonProfile**: Skeleton for user profile information
- **SkeletonCard**: Skeleton for content cards (posts, etc.)
- **SkeletonList**: Skeleton for lists (friends, members, etc.)
- **SkeletonMessage**: Skeleton for message conversations
- **SkeletonPostDetail**: Skeleton for detailed post view
- **SkeletonGroup**: Skeleton for group information
- **SkeletonSidebar**: Skeleton for sidebar navigation
- **SkeletonRightPanel**: Skeleton for right panel with popular groups and online friends

## Usage

```jsx
import { SkeletonProfile, SkeletonCard } from "../components/skeleton";

// In your component
const MyComponent = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    // Fetch data
    // setLoading(false) when data is loaded
  }, []);

  return (
    <div>
      {loading ? <SkeletonProfile /> : <ProfileComponent data={data} />}
    </div>
  );
};
```

## Props

- **SkeletonList**: Accepts a `count` prop to determine how many skeleton items to display (default: 3)

All components use Tailwind CSS for styling and automatically adapt to light/dark mode using the `dark:` variants.
