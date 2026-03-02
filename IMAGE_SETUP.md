# Image Setup Instructions

## Folder Structure Created

The app is ready to use local images. The following folder structure has been created:

```
assets/
  images/
    workshop_kintsugi_basics/
      (add image_1.jpg, image_2.jpg, image_3.jpg here)
    workshop_tea_ceremony/
      (add image_1.jpg, image_2.jpg, image_3.jpg here)
    workshop_traditional_pottery_techniques/
      (add image_1.jpg, image_2.jpg, image_3.jpg here)
    workshop_calligraphy_for_all/
      (add image_1.jpg, image_2.jpg, image_3.jpg here)
    workshop_flower_arrangement/
      (add image_1.jpg, image_2.jpg, image_3.jpg here)
    workshop_woodworking_for_beginners/
      (add image_1.jpg, image_2.jpg, image_3.jpg here)
```

## How It Works

1. **Image Data**: Each workshop in `data/workshops.json` now has an `images` array:
   ```json
   {
     "id": "workshop_kintsugi_basics",
     "images": ["image_1.jpg", "image_2.jpg", "image_3.jpg"],
     ...
   }
   ```

2. **Image Service**: The `workshopService.js` provides two functions:
   - `getWorkshopImageUrl(workshop, imageIndex)` - Get single image by index
   - `getAllWorkshopImages(workshop)` - Get all images for carousel

3. **Components**: 
   - `PictureCard` now displays Image component instead of emoji
   - Automatically handles missing images with placeholder fallback

## To Add Your Images

1. Navigate to each workshop folder in `assets/images/`
2. Add JPG or PNG files named: `image_1.jpg`, `image_2.jpg`, `image_3.jpg`
3. Images will automatically display in:
   - Workshop Details page (carousel)
   - Pictures Gallery page (all images)

## Image Requirements

- **Format**: JPG or PNG
- **Dimensions**: Recommended 400x300px (or aspect ratio 4:3)
- **File size**: Keep under 500KB per image for app performance
- **Naming**: `image_1.jpg`, `image_2.jpg`, `image_3.jpg`

## Testing Without Images

The app will display placeholder images if real images are missing. Once local images are added to the folders, they'll display automatically.
