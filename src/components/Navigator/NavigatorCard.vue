<!--
  This source file is part of the Swift.org open source project

  Copyright (c) 2022 Apple Inc. and the Swift project authors
  Licensed under Apache License v2.0 with Runtime Library Exception

  See https://swift.org/LICENSE.txt for license information
  See https://swift.org/CONTRIBUTORS.txt for Swift project authors
-->

<template>
  <div class="navigator-card">
    <div class="navigator-card-full-height">
      <div class="navigator-card-inner">
        <div class="head-wrapper">
          <button class="close-card-mobile" @click="$emit('close')">
            <SidenavIcon class="icon-inline close-icon" />
          </button>
          <Reference :url="technologyPath" class="navigator-head" :id="INDEX_ROOT_KEY">
            <NavigatorLeafIcon :type="type" with-colors class="card-icon" />
            <div class="card-link">
              {{ technology }}
            </div>
          </Reference>
        </div>
        <div class="card-body">
          <RecycleScroller
            v-show="nodesToRender.length"
            :id="scrollLockID"
            ref="scroller"
            class="scroller"
            aria-label="Sidebar Tree Navigator"
            :items="nodesToRender"
            :item-size="itemSize"
            key-field="uid"
            v-slot="{ item, active }"
            @blur.capture.native="handleBlur"
          >
            <NavigatorCardItem
              :item="item"
              :isRendered="active"
              :filter-pattern="filterPattern"
              :is-active="item.uid === activeUID"
              :is-bold="activePathMap[item.uid]"
              :expanded="openNodes[item.uid]"
              @toggle="toggle"
              @toggle-full="toggleFullTree"
            />
          </RecycleScroller>
          <div class="no-items-wrapper" v-if="!nodesToRender.length">
            <template v-if="hasFilter">
              No results matching your filter
            </template>
            <template v-else-if="errorFetching">
              There was an error fetching the data
            </template>
            <template v-else>
              Technology has no children
            </template>
          </div>
        </div>
      </div>
    </div>
    <div class="filter-wrapper" v-if="!errorFetching">
      <div class="navigator-filter">
        <div class="input-wrapper">
          <FilterInput
            v-model="filter"
            :tags="availableTags"
            :selected-tags.sync="selectedTagsModelValue"
            :placeholder="`Filter in ${technology}`"
            :should-keep-open-on-blur="false"
            :position-reversed="isLargeBreakpoint"
            class="filter-component"
            @clear="clearFilters"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { RecycleScroller } from 'vue-virtual-scroller';
import { clone } from 'docc-render/utils/data';
import { waitFrames } from 'docc-render/utils/loading';
import debounce from 'docc-render/utils/debounce';
import { sessionStorage } from 'docc-render/utils/storage';
import { INDEX_ROOT_KEY, SIDEBAR_ITEM_SIZE } from 'docc-render/constants/sidebar';
import { safeHighlightPattern } from 'docc-render/utils/search-utils';
import NavigatorLeafIcon from 'docc-render/components/Navigator/NavigatorLeafIcon.vue';
import NavigatorCardItem from 'docc-render/components/Navigator/NavigatorCardItem.vue';
import SidenavIcon from 'theme/components/Icons/SidenavIcon.vue';
import Reference from 'docc-render/components/ContentNode/Reference.vue';
import { TopicTypes } from 'docc-render/constants/TopicTypes';
import FilterInput from 'docc-render/components/Filter/FilterInput.vue';
import { BreakpointName } from '@/utils/breakpoints';

const STORAGE_KEYS = {
  filter: 'navigator.filter',
  technology: 'navigator.technology',
  openNodes: 'navigator.openNodes',
  nodesToRender: 'navigator.nodesToRender',
  selectedTags: 'navigator.selectedTags',
};

const FILTER_TAGS = {
  sampleCode: 'sampleCode',
  tutorials: 'tutorials',
  articles: 'articles',
};

const FILTER_TAGS_TO_LABELS = {
  [FILTER_TAGS.sampleCode]: 'Sample Code',
  [FILTER_TAGS.tutorials]: 'Tutorials',
  [FILTER_TAGS.articles]: 'Articles',
};

const FILTER_LABELS_TO_TAGS = Object.fromEntries(
  Object
    .entries(FILTER_TAGS_TO_LABELS)
    .map(([key, value]) => [value, key]),
);

const TOPIC_TYPE_TO_TAG = {
  [TopicTypes.article]: FILTER_TAGS.articles,
  [TopicTypes.learn]: FILTER_TAGS.tutorials,
  [TopicTypes.overview]: FILTER_TAGS.tutorials,
  [TopicTypes.resources]: FILTER_TAGS.tutorials,
  [TopicTypes.sampleCode]: FILTER_TAGS.sampleCode,
  [TopicTypes.section]: FILTER_TAGS.tutorials,
  [TopicTypes.tutorial]: FILTER_TAGS.tutorials,
  [TopicTypes.project]: FILTER_TAGS.tutorials,
};

/**
 * Renders the card for a technology and it's child symbols, in the navigator.
 * For performance reasons, the component uses watchers over computed, so we can more precisely
 * manage when re-calculations and re-rendering is done.
 */
export default {
  name: 'NavigatorCard',
  constants: {
    STORAGE_KEYS,
    FILTER_TAGS,
    FILTER_TAGS_TO_LABELS,
    FILTER_LABELS_TO_TAGS,
    TOPIC_TYPE_TO_TAG,
  },
  components: {
    FilterInput,
    SidenavIcon,
    NavigatorCardItem,
    NavigatorLeafIcon,
    RecycleScroller,
    Reference,
  },
  props: {
    technology: {
      type: String,
      required: true,
    },
    children: {
      type: Array,
      required: true,
    },
    activePath: {
      type: Array,
      required: true,
    },
    type: {
      type: String,
      required: true,
    },
    technologyPath: {
      type: String,
      default: '',
    },
    scrollLockID: {
      type: String,
      default: '',
    },
    errorFetching: {
      type: Boolean,
      default: false,
    },
    breakpoint: {
      type: String,
      default: '',
    },
  },
  data() {
    return {
      // value to v-model the filter to
      filter: '',
      // debounced filter value, to reduce the computed property computations. Used in filter logic.
      debouncedFilter: '',
      selectedTags: [],
      /** @type {Object.<string, boolean>} */
      openNodes: {},
      /** @type {NavigatorFlatItem[]} */
      nodesToRender: [],
    };
  },
  computed: {
    INDEX_ROOT_KEY: () => INDEX_ROOT_KEY,
    availableTags: ({ selectedTags }) => (
      selectedTags.length
        ? []
        : Object.values(FILTER_TAGS_TO_LABELS)
    ),
    selectedTagsModelValue: {
      get: ({ selectedTags }) => selectedTags.map(tag => FILTER_TAGS_TO_LABELS[tag]),
      set(values) {
        this.selectedTags = values.map(label => FILTER_LABELS_TO_TAGS[label]);
      },
    },
    filterPattern: ({ debouncedFilter }) => (!debouncedFilter
      ? null
      // remove the `g` for global, as that causes bugs when matching
      : new RegExp(safeHighlightPattern(debouncedFilter), 'i')),
    /**
     * Return the item size for the Scroller element.
     */
    itemSize: () => SIDEBAR_ITEM_SIZE,
    /**
     * Generates a map of the children, with the uid as the key.
     * @return {Object.<string, NavigatorFlatItem>}
     */
    childrenMap({ children }) {
      return Object.fromEntries(children.map(child => [child.uid, child]));
    },
    /**
     * Returns an array of {NavigatorFlatItem}, for the current page hierarchy
     * @return NavigatorFlatItem[]
     */
    activePathChildren() {
      // get the stack to iterate
      const stack = this.activePath.slice(0).reverse();
      // the items to loop over. First iteration is over all items
      let childrenStack = this.children;
      const result = [];
      // loop as long as there are items
      while (stack.length) {
        // get the last item (first parent, as we reversed it)
        const currentPath = stack.pop();
        // find it by path (we dont have the UID yet)
        const currentNode = childrenStack.find(c => c.path === currentPath);
        if (!currentNode) break;
        // push the object to the results
        result.push(currentNode);
        if (stack.length) {
          // get the children, so we search in those
          childrenStack = currentNode.childUIDs.map(c => this.childrenMap[c]);
        }
      }
      return result;
    },
    activePathMap: ({ activePathChildren }) => (
      Object.fromEntries(activePathChildren.map(({ uid }) => [uid, true]))
    ),
    /**
     * Returns the current page uid
     * @return number
     */
    activeUID({ activePathChildren }) {
      return (activePathChildren[activePathChildren.length - 1] || {}).uid;
    },
    /**
     * Returns a list of the child nodes, that match the filter pattern.
     * @returns NavigatorFlatItem[]
     */
    filteredChildren({
      hasFilter, children, filterPattern, selectedTags,
    }) {
      if (!hasFilter) return [];
      const tagsSet = new Set(selectedTags);
      // find children that match current filters
      return children.filter(({ title, type }) => {
        // check if `title` matches the pattern, if provided
        const titleMatch = filterPattern ? filterPattern.test(title) : true;
        // check if `type` matches any of the selected tags
        const tagMatch = selectedTags.length
          ? tagsSet.has(TOPIC_TYPE_TO_TAG[type]) : true;
        // make sure groupMarker's dont get matched
        return titleMatch && tagMatch && type !== TopicTypes.groupMarker;
      });
    },
    /**
     * Creates a computed for the two items, that the openNodes calc depends on
     */
    nodeChangeDeps: ({
      filteredChildren, activePathChildren, debouncedFilter, selectedTags,
    }) => ([
      filteredChildren,
      activePathChildren,
      debouncedFilter,
      selectedTags,
    ]),
    hasFilter({ debouncedFilter, selectedTags }) {
      return Boolean(debouncedFilter.length || selectedTags.length);
    },
    isLargeBreakpoint: ({ breakpoint }) => breakpoint === BreakpointName.large,
  },
  created() {
    this.restorePersistedState();
  },
  watch: {
    filter: 'debounceInput',
    nodeChangeDeps: 'trackOpenNodes',
    debouncedFilter(value) {
      sessionStorage.set(STORAGE_KEYS.filter, value);
    },
    selectedTags(value) {
      sessionStorage.set(STORAGE_KEYS.selectedTags, value);
    },
  },
  methods: {
    clearFilters() {
      this.filter = '';
      this.debouncedFilter = '';
      this.selectedTags = [];
    },
    debounceInput: debounce(function debounceInput(value) {
      this.debouncedFilter = value;
    }, 500),
    /**
     * Finds which nodes need to be opened.
     * Initiates a watcher, that reacts to filtering and page navigation.
     */
    trackOpenNodes(
      [filteredChildren, activePathChildren, filter, selectedTags],
      [, activePathChildrenBefore, filterBefore, selectedTagsBefore = []] = [],
    ) {
      // skip in case this is a first mount and we are syncing the `filter` and `selectedTags`.
      if (
        (filter !== filterBefore && !filterBefore && sessionStorage.get(STORAGE_KEYS.filter))
        || (
          selectedTags.join() !== selectedTagsBefore.join()
          && !selectedTagsBefore.length
          && sessionStorage.get(STORAGE_KEYS.selectedTags, []).length
        )
      ) {
        return;
      }
      // decide which items are open
      const nodes = !this.hasFilter
        ? activePathChildren
        // get all parents of the current match, excluding it in the process
        : filteredChildren.flatMap(({ uid }) => this.getParents(uid).slice(0, -1));
      // if the activePath items change, we navigated to another page
      const pageChange = activePathChildrenBefore !== activePathChildren;

      // create a map to track open items - `{ [UID]: true }`
      const newOpenNodes = Object.fromEntries(nodes
        .map(({ uid }) => [uid, true]));
      // if we navigate across pages, persist the previously open nodes
      this.openNodes = Object.assign(pageChange ? this.openNodes : {}, newOpenNodes);
      this.generateNodesToRender();
    },
    /**
     * Toggle a node open/close
     */
    toggle(node) {
      // check if the item is open
      const isOpen = this.openNodes[node.uid];
      let include = [];
      let exclude = [];
      // if open, we need to close it
      if (isOpen) {
        // clone the open nodes map
        const openNodes = clone(this.openNodes);
        // remove current node and all of it's children, from the open list
        const allChildren = this.getAllChildren(node.uid);
        allChildren.forEach(({ uid }) => {
          delete openNodes[uid];
        });
        // set the new open nodes. Should be faster than iterating each and calling `this.$delete`.
        this.openNodes = openNodes;
        // exclude all items, but the first
        exclude = allChildren.slice(1);
      } else {
        this.$set(this.openNodes, node.uid, true);
        // include all childUIDs to get opened
        include = node.childUIDs.map(id => this.childrenMap[id]);
      }
      this.augmentRenderNodes({ uid: node.uid, include, exclude });
    },
    /**
     * Handle toggling the entire tree open/close, using alt + click
     */
    toggleFullTree(node) {
      const isOpen = this.openNodes[node.uid];
      const openNodes = clone(this.openNodes);
      const allChildren = this.getAllChildren(node.uid);
      let exclude = [];
      let include = [];
      allChildren.forEach(({ uid }) => {
        if (isOpen) {
          delete openNodes[uid];
        } else {
          openNodes[uid] = true;
        }
      });

      // figure out which items to include and exclude
      if (isOpen) {
        exclude = allChildren.slice(1);
      } else {
        include = allChildren.slice(1);
      }
      this.openNodes = openNodes;
      this.augmentRenderNodes({ uid: node.uid, exclude, include });
    },
    /**
     * Get all children of a node recursively
     * @param {string} uid - the UID of the node
     * @return {NavigatorFlatItem[]}
     */
    getAllChildren(uid) {
      const arr = [];
      const stack = [uid];
      let current = null;

      // loop over the stack
      while (stack.length) {
        // get the top item
        current = stack.shift();
        // find the object
        const obj = this.childrenMap[current];
        // add it's uid
        arr.push(obj);
        // add all if it's children to the front of the stack
        stack.unshift(...obj.childUIDs);
      }

      return arr;
    },
    /**
     * Get all the parents of a node, up to the root.
     * @param {string} uid
     * @return {NavigatorFlatItem[]}
     */
    getParents(uid) {
      const arr = [];
      const stack = [uid];
      let current = null;

      // loop over the stack
      while (stack.length) {
        // get the top item
        current = stack.pop();
        // find the object
        const obj = this.childrenMap[current];
        // push the object to the results
        arr.unshift(obj);
        // if the current object has a parent and its not the root, add it to the stack
        if (obj.parent && obj.parent !== INDEX_ROOT_KEY) {
          stack.push(obj.parent);
        }
      }
      return arr;
    },
    /**
     * Stores all the nodes we should render at this point.
     * This gets called everytime you open/close a node,
     * or when you start filtering.
     * @return void
     */
    generateNodesToRender() {
      const {
        children, filteredChildren, hasFilter, openNodes,
      } = this;
      // create a set of all matches and their parents
      const allChildMatchesSet = new Set(filteredChildren
        .flatMap(({ uid }) => this.getParents(uid)));
      // create a set of direct matches
      const filteredChildrenSet = new Set(filteredChildren);

      // generate the list of nodes to render
      this.nodesToRender = children
        .filter((child) => {
          // if we have no filter pattern, just show open nodes and root nodes
          if (!hasFilter) {
            // if parent is the root or parent is open
            return child.parent === INDEX_ROOT_KEY || openNodes[child.parent];
          }
          // if parent is the root and is in the child match set
          return (child.parent === INDEX_ROOT_KEY && allChildMatchesSet.has(child))
            // if the parent is open and is a direct filter match
            || (openNodes[child.parent] && filteredChildrenSet.has(this.childrenMap[child.parent]))
            // if the item itself is a direct match
            || allChildMatchesSet.has(child);
        });
      // persist all the open nodes
      this.persistState();
      // wait a frame, so the scroller is ready, `nextTick` is not enough.
      this.scrollToElement();
    },
    /**
     * Augments the nodesToRender, by injecting or removing items.
     * Used mainly to toggle items on/off
     */
    augmentRenderNodes({ uid, include = [], exclude = [] }) {
      const index = this.nodesToRender.findIndex(n => n.uid === uid);
      // decide if should remove or add
      if (include.length) {
        // if add, find where to inject items
        this.nodesToRender.splice(index + 1, 0, ...include);
      } else if (exclude.length) {
        // if remove, filter out those items
        const excludeSet = new Set(exclude);
        this.nodesToRender = this.nodesToRender.filter(item => !excludeSet.has(item));
      }
      this.persistState();
    },
    /**
     * Persists the current state, so its not lost if you refresh or navigate away
     */
    persistState() {
      sessionStorage.set(STORAGE_KEYS.technology, this.technology);
      // store the keys of the openNodes map, converting to number, to reduce space
      sessionStorage.set(STORAGE_KEYS.openNodes, Object.keys(this.openNodes).map(Number));
      // we need only the UIDs
      sessionStorage.set(STORAGE_KEYS.nodesToRender, this.nodesToRender.map(({ uid }) => uid));
    },
    /**
     * Restores the persisted state from sessionStorage. Called on `create` hook.
     */
    restorePersistedState() {
      const technology = sessionStorage.get(STORAGE_KEYS.technology);
      const nodesToRender = sessionStorage.get(STORAGE_KEYS.nodesToRender, []);
      const filter = sessionStorage.get(STORAGE_KEYS.filter, '');

      // if for some reason there are no nodes and no filter, we can assume its bad cache
      if (!nodesToRender.length && !filter) {
        this.trackOpenNodes(this.nodeChangeDeps);
        return;
      }
      // make sure all nodes exist in the childrenMap
      const allNodesMatch = nodesToRender.every(uid => this.childrenMap[uid]);
      // if the technology does not match, do not use the persisted values
      if (technology !== this.technology || !allNodesMatch) {
        this.trackOpenNodes(this.nodeChangeDeps);
        return;
      }
      // get all open nodes
      const openNodes = sessionStorage.get(STORAGE_KEYS.openNodes, []);
      // create the openNodes map
      this.openNodes = Object.fromEntries(openNodes.map(n => [n, true]));
      // get all the nodes to render
      // generate the array of flat children objects to render
      this.nodesToRender = nodesToRender.map(uid => this.childrenMap[uid]);
      // finally fetch any previously assigned filters or tags
      this.selectedTags = sessionStorage.get(STORAGE_KEYS.selectedTags, []);
      this.filter = filter;
      this.debouncedFilter = this.filter;
      // scroll to the active element
      this.scrollToElement();
    },
    async scrollToElement() {
      await waitFrames(1);
      // if we are filtering, it makes more sense to scroll to top of list
      const index = this.hasFilter
        ? 0
        // find the index of the current active UID in the newly added nodes
        : this.nodesToRender.findIndex(child => child.uid === this.activeUID);
      // if for some reason we cant find the active page, bail.
      // make sure the scroller is visible
      if (index !== -1 && this.$refs.scroller) {
        // call the scroll method on the `scroller` component.
        this.$refs.scroller.scrollToItem(index);
      }
    },
    handleBlur(event) {
      // if there is a related target, do nothing
      if (event.relatedTarget !== null) return;
      // if there is no related target re-focus the item
      const { y } = event.target.getBoundingClientRect();
      if (y < 0) {
        return;
      }
      event.target.focus({
        preventScroll: true,
      });
    },
  },
};
</script>

<style scoped lang='scss'>
@import 'docc-render/styles/_core.scss';
@import '~vue-virtual-scroller/dist/vue-virtual-scroller.css';

$navigator-card-horizontal-spacing: 20px !default;
$navigator-card-vertical-spacing: 8px !default;
$filter-height: 64px;

.navigator-card {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;

  .navigator-card-full-height {
    height: 100%;
  }

  .navigator-card-inner {
    position: sticky;
    top: $nav-height;
    height: calc(100vh - #{$nav-height} - #{$filter-height});
    display: flex;
    flex-flow: column;
    @include breakpoint(medium, nav) {
      position: static;
      height: 100%;
    }
  }

  .head-wrapper {
    position: relative;
  }

  .navigator-head {
    padding: 10px $navigator-card-horizontal-spacing;
    border-bottom: 1px solid var(--color-grid);
    display: flex;
    align-items: baseline;

    &.router-link-exact-active {
      background: var(--color-fill-gray-quaternary);
    }

    @include breakpoint(medium, nav) {
      justify-content: center;
      padding: 14px $navigator-card-horizontal-spacing;
    }

    @include breakpoint(small, nav) {
      padding: 12px $navigator-card-horizontal-spacing;
    }
  }

  .card-icon {
    width: 19px;
    height: 19px;
  }
}

.no-items-wrapper {
  color: var(--color-figure-gray-tertiary);
  @include font-styles(body-reduced);
  padding: var(--card-vertical-spacing) 0;
}

.close-card-mobile {
  display: none;
  position: absolute;
  z-index: 1;
  color: var(--color-link);
  align-items: center;
  justify-content: center;

  @include breakpoint(medium, nav) {
    display: flex;
    left: 0;
    height: 100%;
    padding-left: $nav-padding-wide;
    padding-right: $nav-padding-wide;
  }

  @include breakpoint(small, nav) {
    padding-left: $nav-padding-small;
    padding-right: $nav-padding-small;
  }

  .close-icon {
    width: 19px;
    height: 19px;
  }
}

.card-body {
  --card-horizontal-spacing: #{$navigator-card-horizontal-spacing};
  --card-vertical-spacing: #{$navigator-card-vertical-spacing};

  padding: 0 var(--card-horizontal-spacing);
  // right padding is added by the items, so visually the scroller is stuck to the side
  padding-right: 0;
  flex: 1 1 auto;
  min-height: 0;
  @include breakpoint(medium, nav) {
    --card-horizontal-spacing: 20px;
    --card-vertical-spacing: 0px;
    padding-top: $filter-height;
  }
}

.card-link {
  color: var(--color-text);
  @include font-styles(body-reduced);
  font-weight: $font-weight-semibold;
}

.navigator-filter {
  box-sizing: border-box;
  padding: 14px 30px;
  border-top: 1px solid var(--color-grid);
  height: 71px;
  display: flex;
  align-items: flex-end;

  @include breakpoint(medium, nav) {
    border: none;
    padding: 10px 20px;
    align-items: flex-start;
  }

  .input-wrapper {
    position: relative;
    flex: 1;
    min-width: 0;
  }

  .filter-component {
    --input-vertical-padding: 10px;
    --input-height: 20px;
    --input-border-color: var(--color-grid);
    --input-text: var(--color-figure-gray-secondary);

    /deep/ .filter__input {
      @include font-styles(body);
    }
  }
}

.scroller {
  height: 100%;
  box-sizing: border-box;
  padding: var(--card-vertical-spacing) 0;
  padding-right: var(--card-horizontal-spacing);
}

.filter-wrapper {
  position: sticky;
  bottom: 0;
  background: var(--color-fill);
  @include breakpoint(medium, nav) {
    position: absolute;
    top: $nav-height;
    bottom: auto;
    width: 100%;
  }
  @include breakpoint(small, nav) {
    top: $nav-height-small;
  }
}

</style>
