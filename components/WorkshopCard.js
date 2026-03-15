// Progress: this component is implemented and currently stable in the app UI flow.
// Reusable workshop card for browse and favourites lists
import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { CameraIcon, HeartIcon } from 'react-native-heroicons/outline';
import { COLORS } from '../styles/colors';
import TopWorkshopTag from './TopWorkshopTag';

export default function WorkshopCard({ workshop, onPress, onFavouriteToggle }) {
  // Track image loading state per card instance
  const [imageLoading, setImageLoading] = useState(true);
  const firstImageUrl = workshop.images && workshop.images.length > 0
    ? workshop.images[0]
    : null;

  return (
    <Pressable
      style={styles.card}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`View ${workshop.title} workshop details`}
    >
      {/* Workshop image with loading state */}
      <View style={styles.cardImagePlaceholder}>
        {firstImageUrl ? (
          <>
            {imageLoading && (
              <ActivityIndicator
                size="small"
                color="#8B7B6B"
                style={StyleSheet.absoluteFill}
              />
            )}
            <Image
              source={{ uri: firstImageUrl }}
              style={styles.cardImage}
              contentFit="cover"
              cachePolicy="disk"
              onLoadStart={() => setImageLoading(true)}
              onLoadEnd={() => setImageLoading(false)}
              onError={() => setImageLoading(false)}
              accessibilityLabel={`${workshop.title} workshop image`}
              accessibilityRole="image"
            />
          </>
        ) : (
          <CameraIcon size={36} color={COLORS.imagePlaceholderIcon} />
        )}

        {workshop.isTop && (
          <TopWorkshopTag />
        )}
      </View>

      {/* Workshop info */}
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <View style={styles.cardMeta}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {workshop.title}
            </Text>
            <Text style={styles.cardCategory}>{workshop.category}</Text>
          </View>

          {/* Optional favourite toggle button */}
          {onFavouriteToggle && (
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                onFavouriteToggle(workshop.id);
              }}
              style={styles.favouriteButton}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${workshop.title} from favourites`}
            >
              <HeartIcon size={18} color={COLORS.favourite} />
            </Pressable>
          )}
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.cardLocation}>{workshop.ward}</Text>
          <Text style={styles.cardPrice}>ֲ¥{workshop.priceYen.toLocaleString()}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
      },
      android: {
        elevation: 2,
      },
    }),
  },
  cardImagePlaceholder: {
    width: '100%',
    height: 160,
    backgroundColor: COLORS.imagePlaceholderBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardContent: {
    padding: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardMeta: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.primaryText,
    marginBottom: 4,
  },
  cardCategory: {
    fontSize: 13,
    color: COLORS.secondaryText,
  },
  favouriteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.dangerBackground,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  cardLocation: {
    fontSize: 13,
    color: COLORS.secondaryText,
  },
  cardPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primaryText,
  },
});

