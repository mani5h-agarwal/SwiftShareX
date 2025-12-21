import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

export type TabItem = {
  key: string;
  label: string;
  icon?: string;
  badgeCount?: number;
};

type Props = {
  items: TabItem[];
  activeKey: string;
  onChange: (key: string) => void;
};

export const TabBar: React.FC<Props> = ({ items, activeKey, onChange }) => {
  return (
    <View style={styles.tabBar}>
      {items.map(item => {
        const isActive = item.key === activeKey;
        return (
          <Pressable
            key={item.key}
            style={[styles.tab, isActive && styles.tabActive]}
            onPress={() => onChange(item.key)}
          >
            <View style={styles.tabContent}>
              {item.icon ? (
                <Text
                  style={[styles.tabIcon, isActive && styles.tabIconActive]}
                >
                  {item.icon}
                </Text>
              ) : null}
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {item.label}
              </Text>
              {typeof item.badgeCount === 'number' ? (
                <View
                  style={[styles.tabBadge, isActive && styles.tabBadgeActive]}
                >
                  <Text
                    style={[
                      styles.tabBadgeText,
                      isActive && styles.tabBadgeTextActive,
                    ]}
                  >
                    {item.badgeCount}
                  </Text>
                </View>
              ) : null}
            </View>
            {isActive && <View style={styles.tabIndicator} />}
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    position: 'relative',
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  tabIcon: {
    fontSize: 20,
    color: '#9CA3AF',
  },
  tabIconActive: {
    color: '#804DCC',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  tabTextActive: {
    color: '#1F2937',
  },
  tabBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 24,
  },
  tabBadgeActive: {
    backgroundColor: '#804DCC',
  },
  tabBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    textAlign: 'center',
  },
  tabBadgeTextActive: {
    color: 'white',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#804DCC',
    borderRadius: 2,
  },
  tabActive: {},
});

export default TabBar;
