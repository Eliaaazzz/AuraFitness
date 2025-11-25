import React, { PropsWithChildren } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';

import { spacing } from '@/utils';
import { useResponsiveColumns, useResponsive } from '@/utils/responsive';

interface ResponsiveGridProps {
  /**
   * Custom number of columns per breakpoint
   */
  columns?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
    wide?: number;
  };
  /**
   * Gap between grid items
   * @default spacing.md
   */
  gap?: number;
  /**
   * Additional styles for the container
   */
  style?: ViewStyle;
  /**
   * Additional styles for each grid item wrapper
   */
  itemStyle?: ViewStyle;
}

/**
 * Responsive grid component that adapts number of columns based on screen size
 *
 * @example
 * <ResponsiveGrid columns={{ mobile: 1, tablet: 2, desktop: 3 }}>
 *   <RecipeCard />
 *   <RecipeCard />
 *   <RecipeCard />
 * </ResponsiveGrid>
 */
export const ResponsiveGrid = ({
  children,
  columns,
  gap = spacing.md,
  style,
  itemStyle,
}: PropsWithChildren<ResponsiveGridProps>) => {
  const numColumns = useResponsiveColumns(columns);
  const { width } = useResponsive();

  // Convert children to array
  const childArray = React.Children.toArray(children);

  // Calculate item width based on number of columns and gap
  const totalGap = gap * (numColumns - 1);
  const availableWidth = width - totalGap;
  const itemWidth = availableWidth / numColumns;

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.grid, { gap }]}>
        {childArray.map((child, index) => (
          <View
            key={index}
            style={[
              styles.gridItem,
              {
                width: `${100 / numColumns}%`,
                // Remove gap from item width
                maxWidth: itemWidth,
              },
              itemStyle,
            ]}
          >
            {child}
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
  },
  gridItem: {
    // Items will size based on percentage width
  },
});
