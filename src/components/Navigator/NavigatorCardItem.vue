<!--
  This source file is part of the Swift.org open source project

  Copyright (c) 2022 Apple Inc. and the Swift project authors
  Licensed under Apache License v2.0 with Runtime Library Exception

  See https://swift.org/LICENSE.txt for license information
  See https://swift.org/CONTRIBUTORS.txt for Swift project authors
-->

<template>
  <div
    class="navigator-card-item"
    :class="{ expanded }"
    :style="{ '--nesting-index': item.depth }"
    :aria-hidden="isRendered ? null : 'true'"
    :id="`container-${item.uid}`"
  >
    <div class="head-wrapper" :class="{ active: isActive, 'is-group': isGroupMarker }">
      <span
        v-if="isParent"
        hidden
        :id="buttonParentLabel"
      >
        {{ item.childUIDs.length }} symbols to be {{ expanded ? 'collapsed' : 'expanded'}}
      </span>
      <div class="depth-spacer">
        <button
          v-if="isParent"
          :aria-describedby="buttonParentLabel"
          class="tree-toggle"
          :tabindex="isRendered ? null : '-1'"
          :aria-label="`Toggle ${item.title}`"
          :aria-controls="`container-${item.uid}`"
          :aria-expanded="expanded ? 'true': 'false'"
          @click.exact.prevent="toggleTree"
          @click.alt.prevent="toggleEntireTree"
        >
          <InlineChevronRightIcon class="icon-inline chevron" :class="{ rotate: expanded }" />
        </button>
      </div>
      <NavigatorLeafIcon v-if="!isGroupMarker" :type="item.type" class="navigator-icon" />
      <div class="title-container">
        <span
          v-if="isParent"
          hidden
          :id="parentLabel"
        >, containing {{ item.childUIDs.length }} symbols</span>
        <span
          :id="siblingsLabel"
          hidden
        >
          {{ item.index + 1 }} of {{ item.siblingsCount }} symbols inside
        </span>
        <Reference
          :id="item.uid"
          :url="item.path || ''"
          :isActive="!isGroupMarker"
          :class="{ bolded: isBold }"
          class="leaf-link"
          :aria-describedby="ariaDescribedBy"
          :tabindex="isRendered ? null : '-1'"
        >
          <HighlightMatches
            :text="item.title"
            :matcher="filterPattern"
          />
        </Reference>
        <Badge v-if="isDeprecated" variant="deprecated" />
      </div>
    </div>
  </div>
</template>

<script>
import InlineChevronRightIcon from 'theme/components/Icons/InlineChevronRightIcon.vue';
import NavigatorLeafIcon from 'docc-render/components/Navigator/NavigatorLeafIcon.vue';
import HighlightMatches from 'docc-render/components/Navigator/HighlightMatches.vue';
import Reference from 'docc-render/components/ContentNode/Reference.vue';
import Badge from 'docc-render/components/Badge.vue';
import { TopicTypes } from 'docc-render/constants/TopicTypes';

export default {
  name: 'NavigatorCardItem',
  components: {
    HighlightMatches,
    NavigatorLeafIcon,
    InlineChevronRightIcon,
    Reference,
    Badge,
  },
  props: {
    isRendered: {
      type: Boolean,
      default: false,
    },
    item: {
      type: Object,
      required: true,
    },
    expanded: {
      type: Boolean,
      default: false,
    },
    filterPattern: {
      type: RegExp,
      default: undefined,
    },
    isActive: {
      type: Boolean,
      default: false,
    },
    isBold: {
      type: Boolean,
      default: false,
    },
  },
  computed: {
    isGroupMarker: ({ item: { type } }) => type === TopicTypes.groupMarker,
    isParent: ({ item }) => !!item.childUIDs.length,
    parentLabel: ({ item }) => `label-parent-${item.uid}`,
    siblingsLabel: ({ item }) => `label-${item.uid}`,
    buttonParentLabel: ({ item }) => `button-parent-${item.uid}`,
    ariaDescribedBy({
      item, siblingsLabel, parentLabel, isParent,
    }) {
      const baseLabel = `${siblingsLabel} ${item.parent}`;
      if (!isParent) return baseLabel;
      return `${baseLabel} ${parentLabel}`;
    },
    isDeprecated: ({ item: { deprecated } }) => !!deprecated,
  },
  methods: {
    toggleTree() {
      this.$emit('toggle', this.item);
    },
    toggleEntireTree() {
      this.$emit('toggle-full', this.item);
    },
  },
};
</script>

<style scoped lang='scss'>
@import 'docc-render/styles/_core.scss';

$item-height: 32px;

.navigator-card-item {
  height: $item-height;
  display: flex;
  align-items: center;
}

.depth-spacer {
  width: calc(var(--nesting-index) * 14px + 26px);
  height: $item-height;
  position: relative;
  flex: 0 0 auto;
}

.head-wrapper {
  padding: 0 5px 0 0;
  position: relative;
  display: flex;
  align-items: center;
  border-radius: $border-radius;
  flex: 1;
  min-width: 0;
  height: 100%;

  &.active {
    background: var(--color-fill-gray-quaternary);
  }

  &.is-group {
    .leaf-link {
      color: var(--color-figure-gray-secondary);
      font-weight: $font-weight-semibold;
    }
  }

  .hover &:not(.is-group) {
    background: var(--color-navigator-item-hover);
  }

  .navigator-icon {
    display: flex;
    flex: 0 0 auto;
  }

  .leaf-link {
    color: var(--color-figure-gray);
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
    max-width: 100%;
    display: inline;
    vertical-align: middle;
    @include font-styles(body-reduced-tight);

    &.bolded {
      font-weight: $font-weight-semibold;
    }

    &:after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
    }
  }
}

.extended-content {
  @include font-styles(body-reduced);
  color: var(--color-figure-gray-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tree-toggle {
  position: absolute;
  width: 100%;
  height: 100%;
  padding-right: 5px;
  box-sizing: border-box;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.title-container {
  min-width: 0;
  display: flex;
  align-items: center;
}

.chevron {
  width: 0.6em;
  transition: transform 0.15s ease-in;

  &.rotate {
    transform: rotate(90deg);
  }
}
</style>
