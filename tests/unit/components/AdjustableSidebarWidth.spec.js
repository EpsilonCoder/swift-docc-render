/**
 * This source file is part of the Swift.org open source project
 *
 * Copyright (c) 2022 Apple Inc. and the Swift project authors
 * Licensed under Apache License v2.0 with Runtime Library Exception
 *
 * See https://swift.org/LICENSE.txt for license information
 * See https://swift.org/CONTRIBUTORS.txt for Swift project authors
*/

import AdjustableSidebarWidth, {
  eventsMap,
  STORAGE_KEY,
  MAX_WIDTH,
  ULTRA_WIDE_DEFAULT,
} from '@/components/AdjustableSidebarWidth.vue';
import { shallowMount } from '@vue/test-utils';
import { storage } from 'docc-render/utils/storage';
import BreakpointEmitter from '@/components/BreakpointEmitter.vue';
import { waitFrames } from '@/utils/loading';
import FocusTrap from '@/utils/FocusTrap';
import scrollLock from 'docc-render/utils/scroll-lock';
import changeElementVOVisibility from 'docc-render/utils/changeElementVOVisibility';
import { BreakpointName, BreakpointScopes } from '@/utils/breakpoints';
import { createEvent, flushPromises } from '../../../test-utils';

jest.mock('docc-render/utils/debounce');
jest.mock('docc-render/utils/storage');

jest.mock('docc-render/utils/changeElementVOVisibility');
jest.mock('docc-render/utils/scroll-lock');
jest.mock('docc-render/utils/FocusTrap');
jest.mock('docc-render/utils/throttle', () => jest.fn(v => v));

storage.get.mockImplementation((key, value) => value);

const { SCROLL_LOCK_ID } = AdjustableSidebarWidth.constants;

const scrollLockTarget = document.createElement('DIV');
scrollLockTarget.id = SCROLL_LOCK_ID;
document.body.appendChild(scrollLockTarget);

const maxWidth = 500; // 50% of the innerWidth, as per the default maxWidth on large
let slotProps = {};

const createWrapper = opts => shallowMount(AdjustableSidebarWidth, {
  slots: {
    default: '<div class="default-content">Default Content</div>',
  },
  scopedSlots: {
    aside(props) {
      slotProps = props;
      return this.$createElement('div', { class: 'aside-content' }, 'Aside Content');
    },
  },
  mocks: { $route: {} },
  ...opts,
});

function assertWidth(wrapper, value) {
  expect(wrapper.find('.aside').attributes('style')).toContain(`width: ${value}px`);
}

Object.defineProperty(HTMLElement.prototype, 'offsetLeft', { configurable: true, value: 100 });

describe('AdjustableSidebarWidth', () => {
  beforeEach(() => {
    window.innerWidth = 1000; // 1000 for easy math
    jest.clearAllMocks();
  });
  it('renders the AdjustableSidebarWidth', () => {
    const wrapper = createWrapper();
    // sidebar
    expect(wrapper.find('.sidebar').exists()).toBe(true);
    expect(wrapper.find('.aside').exists()).toBe(true);
    // handle
    expect(wrapper.find('.resize-handle').exists()).toBe(true);
    // sidebar-slot
    expect(wrapper.find('.aside-content').text()).toBe('Aside Content');
    // content and default slot
    expect(wrapper.find('.default-content').text()).toBe('Default Content');
  });

  it('provides props from the aside scoped slot', () => {
    createWrapper();
    expect(slotProps).toEqual({
      animationClass: 'aside-animated-child',
      scrollLockID: 'sidebar-scroll-lock',
      breakpoint: 'large',
    });
  });

  describe('on mount', () => {
    it('sets the `width` to the middle between min and max for `large`, on mount', () => {
      const wrapper = createWrapper();
      assertWidth(wrapper, 350); // 35% on large
    });

    it('changes the `width`, to the next closest max or min, on mount, as soon as the breakpoint gets changed', () => {
      const wrapper = createWrapper({
        data: () => ({
          width: 650,
        }),
      });
      assertWidth(wrapper, 650);
      wrapper.find(BreakpointEmitter).vm.$emit('change', 'medium');
      assertWidth(wrapper, 500); // 50% on medium
    });

    it('applies a momentary no-transition class to the aside, if going from a larger breakpoint into `small`', async () => {
      const wrapper = createWrapper();
      const aside = wrapper.find('.aside');
      expect(aside.classes()).not.toContain('no-transition');
      const emitter = wrapper.find(BreakpointEmitter);
      expect(emitter.props('scope')).toEqual(BreakpointScopes.nav);
      emitter.vm.$emit('change', 'small');
      expect(aside.classes()).toContain('no-transition');
      await waitFrames(5);
      expect(aside.classes()).not.toContain('no-transition');
      // try going back to large now
      emitter.vm.$emit('change', 'large');
      expect(aside.classes()).toContain('no-transition');
      await waitFrames(5);
      expect(aside.classes()).not.toContain('no-transition');
    });

    it('sets the `width` to the last stored value', () => {
      storage.get.mockReturnValueOnce(450);
      const wrapper = createWrapper();
      assertWidth(wrapper, 450);
      // assert the storage was called with the key and the default size
      // 350 is half of min and max on Large
      expect(storage.get).toHaveBeenLastCalledWith(STORAGE_KEY, 350);
    });

    it('sets the `width` to the `max width allowed`, if stored value is bigger', () => {
      storage.get.mockReturnValueOnce(window.innerWidth + 500);
      const wrapper = createWrapper();
      assertWidth(wrapper, maxWidth); // 80% of 1000
    });

    it('sets the `width` to the `min` width allowed, if stored value is smaller', () => {
      storage.get.mockReturnValueOnce(100);
      const wrapper = createWrapper();
      assertWidth(wrapper, 200); // 20% of 1000
    });

    it('sets the `width` to the `ULTRA_WIDE_DEFAULT`, if no stored value, and on a very large monitor', () => {
      window.innerWidth = MAX_WIDTH;
      storage.get.mockImplementationOnce((key, value) => value);
      const wrapper = createWrapper();
      assertWidth(wrapper, ULTRA_WIDE_DEFAULT);
    });
  });

  describe('external open', () => {
    it('allows opening the sidebar externally', async () => {
      const wrapper = createWrapper();
      await flushPromises();
      // assert not open
      const aside = wrapper.find('.aside');
      expect(aside.classes()).not.toContain('force-open');
      expect(FocusTrap).toHaveBeenCalledTimes(1);
      expect(FocusTrap.mock.results[0].value.start).toHaveBeenCalledTimes(0);
      expect(FocusTrap.mock.results[0].value.stop).toHaveBeenCalledTimes(0);
      // trigger opening externally
      wrapper.setProps({ openExternally: true });
      await flushPromises();
      // assert open class attached
      expect(aside.classes()).toContain('force-open');
      // assert scroll lock and other helpers initiated
      expect(scrollLock.lockScroll).toHaveBeenCalledWith(scrollLockTarget);
      expect(changeElementVOVisibility.hide).toHaveBeenCalledWith(aside.element);
      expect(FocusTrap.mock.results[0].value.start).toHaveBeenCalledTimes(1);
      expect(FocusTrap.mock.results[0].value.stop).toHaveBeenCalledTimes(0);
      // close again
      wrapper.setProps({ openExternally: false });
      await flushPromises();
      // assert class
      expect(aside.classes()).not.toContain('force-open');
      // assert helper status
      expect(scrollLock.unlockScroll).toHaveBeenCalledWith(scrollLockTarget);
      expect(changeElementVOVisibility.show).toHaveBeenCalledWith(aside.element);
      expect(FocusTrap.mock.results[0].value.start).toHaveBeenCalledTimes(1);
      expect(FocusTrap.mock.results[0].value.stop).toHaveBeenCalledTimes(1);
    });

    it('allows closing the sidebar, with Esc', () => {
      const wrapper = createWrapper({
        propsData: {
          openExternally: true,
        },
      });
      window.dispatchEvent(createEvent('keydown', {
        key: 'Escape',
      }));
      expect(wrapper.emitted('update:openExternally')).toEqual([[false]]);
    });

    it('allows closing the sidebar, when `$route` changes', () => {
      // cannot mock the entire $route, and trigger watchers
      expect(AdjustableSidebarWidth.watch.$route).toEqual('closeMobileSidebar');
    });

    it('closes the nav, on breakpoint change from medium to large', async () => {
      const wrapper = createWrapper({
        propsData: {
          openExternally: true,
        },
      });
      // setup
      wrapper.find(BreakpointEmitter).vm.$emit('change', BreakpointName.medium);
      await wrapper.vm.$nextTick();
      expect(wrapper.emitted('update:openExternally')).toBeFalsy();
      // true test
      wrapper.find(BreakpointEmitter).vm.$emit('change', BreakpointName.large);
      expect(wrapper.emitted('update:openExternally')).toEqual([[false]]);
    });
  });

  it('changes the sidebar width, if outside the min/max on orientation change', async () => {
    // set prev stored value to max beyond max value
    storage.get.mockReturnValueOnce(window.innerWidth);
    const wrapper = createWrapper();
    // simulate window changes width form orientation change.
    // This should trigger both breakpoint emitter and window resize, but not in Jest
    window.innerWidth = 500;
    window.dispatchEvent(createEvent('orientationchange'));
    await flushPromises();
    assertWidth(wrapper, 250); // 50% of 500, on large
    window.innerWidth = 1000;
    window.dispatchEvent(createEvent('orientationchange'));
    await flushPromises();
    assertWidth(wrapper, 250); // 20% out of 1000, as that is the min percentage
  });

  it('changes the sidebar width, if outside the min/max on resize', async () => {
    // set prev stored value to max beyond max value
    storage.get.mockReturnValueOnce(window.innerWidth);
    const wrapper = createWrapper();
    // simulate window changes width form orientation change.
    // This should trigger both breakpoint emitter and window resize, but not in Jest
    window.innerWidth = 500;
    window.dispatchEvent(createEvent('resize'));
    await flushPromises();
    assertWidth(wrapper, 250); // 50% of 500, on large
    window.innerWidth = 1000;
    window.dispatchEvent(createEvent('resize'));
    await flushPromises();
    assertWidth(wrapper, 250); // 20% out of 1000, as that is the min percentage
  });

  it('sets helper classes when `fully open`', () => {
    storage.get.mockReturnValueOnce(window.innerWidth);
    const wrapper = createWrapper();
    expect(wrapper.find('.sidebar').classes()).toContain('fully-open');
    assertWidth(wrapper, maxWidth);
  });

  it('allows dragging the handle to expand/contract the sidebar, with the mouse', () => {
    const wrapper = createWrapper();
    const aside = wrapper.find('.aside');
    // assert dragging
    wrapper.find('.resize-handle').trigger('mousedown', { type: 'mouseevent' });
    document.dispatchEvent(createEvent(eventsMap.mouse.move, {
      clientX: 500,
    }));
    // assert class
    expect(aside.classes()).toContain('dragging');
    assertWidth(wrapper, 400); // offset is 100, so we remove it from the clientX
    // assert maxWidth
    document.dispatchEvent(createEvent(eventsMap.mouse.move, {
      clientX: window.innerWidth + 150,
    }));
    assertWidth(wrapper, maxWidth);
    // assert drop
    document.dispatchEvent(createEvent(eventsMap.mouse.end));
    // assert emit event
    expect(wrapper.emitted('width-change')).toHaveLength(4);
    expect(wrapper.emitted('width-change')[3]).toEqual([maxWidth]);
    // assert saved storage
    expect(storage.set).toHaveBeenLastCalledWith(STORAGE_KEY, maxWidth);
    // assert drag stopped
    expect(aside.classes()).not.toContain('dragging');
    // assert dragging no longer works
    document.dispatchEvent(createEvent(eventsMap.mouse.move, {
      clientX: 800,
    }));
    // assert class
    expect(aside.classes()).not.toContain('dragging');
    assertWidth(wrapper, maxWidth);
  });

  it('allows dragging the handle to expand/contract the sidebar, with the touch device', () => {
    const wrapper = createWrapper();
    const aside = wrapper.find('.aside');
    // assert dragging
    wrapper.find('.resize-handle').trigger('touchstart', { type: 'touchstart' });
    document.dispatchEvent(createEvent(eventsMap.touch.move, {
      touches: [{
        clientX: 500,
      }],
    }));
    // assert class
    expect(aside.classes()).toContain('dragging');
    assertWidth(wrapper, 400); // offset is 100, so we remove it from the clientX
    // assert maxWidth
    document.dispatchEvent(createEvent(eventsMap.touch.move, {
      touches: [{
        clientX: window.innerWidth + 150,
      }],
    }));
    assertWidth(wrapper, maxWidth);
    // assert drop
    document.dispatchEvent(createEvent(eventsMap.touch.end));
    // assert emit event
    expect(wrapper.emitted('width-change')).toHaveLength(4);
    expect(wrapper.emitted('width-change')[3]).toEqual([maxWidth]);
    // assert saved storage
    expect(storage.set).toHaveBeenLastCalledWith(STORAGE_KEY, maxWidth);
    // assert drag stopped
    expect(aside.classes()).not.toContain('dragging');
    // assert dragging no longer works
    document.dispatchEvent(createEvent(eventsMap.touch.move, {
      touches: [{
        clientX: 800,
      }],
    }));
    // assert class
    expect(aside.classes()).not.toContain('dragging');
    assertWidth(wrapper, maxWidth);
  });

  it('prevents dragging outside of the window', () => {
    window.innerWidth = 1000;
    const wrapper = createWrapper();
    const aside = wrapper.find('.aside');
    // assert dragging
    wrapper.find('.resize-handle').trigger('mousedown', { type: 'mousedown' });
    document.dispatchEvent(createEvent(eventsMap.mouse.move, {
      clientX: window.innerWidth + 500,
    }));
    // assert class
    expect(aside.classes()).toContain('dragging');
    assertWidth(wrapper, maxWidth); // wrapper is no wider than the max width
  });

  it('prevents dragging outside of the max container', () => {
    window.innerWidth = MAX_WIDTH + 200; // very wide screen
    const wrapper = createWrapper();
    const aside = wrapper.find('.aside');
    // assert dragging
    wrapper.find('.resize-handle').trigger('mousedown', { type: 'mousedown' });
    document.dispatchEvent(createEvent(eventsMap.mouse.move, {
      clientX: window.innerWidth + 500,
    }));
    // assert class
    expect(aside.classes()).toContain('dragging');
    assertWidth(wrapper, 900); // wrapper is no wider than 50% of the widest possible, which is 1800
  });

  it('prevents dragging below the `minWidth`', () => {
    const wrapper = createWrapper();
    const aside = wrapper.find('.aside');
    // assert dragging
    wrapper.find('.resize-handle').trigger('mousedown', { type: 'mousedown' });
    document.dispatchEvent(createEvent(eventsMap.mouse.move, {
      clientX: 100,
    }));
    // assert class
    expect(aside.classes()).toContain('dragging');
    assertWidth(wrapper, 200); // wrapper is minimum 20% of the screen (1000px)
  });

  it('removes any locks upon destruction', async () => {
    const wrapper = createWrapper();
    await flushPromises();
    wrapper.setProps({ openExternally: true });
    await flushPromises();
    wrapper.destroy();
    expect(FocusTrap.mock.results[0].value.destroy).toHaveBeenCalledTimes(1);
    expect(scrollLock.unlockScroll).toHaveBeenCalledTimes(1);
    expect(FocusTrap.mock.results[0].value.stop).toHaveBeenCalledTimes(1);
    expect(changeElementVOVisibility.show).toHaveBeenCalledTimes(1);
  });

  it('accounts for zoomed in devices', () => {
    window.scrollX = 55;
    const wrapper = createWrapper();
    const aside = wrapper.find('.aside');
    // assert dragging
    wrapper.find('.resize-handle').trigger('touchstart', { type: 'touchstart' });
    document.dispatchEvent(createEvent(eventsMap.touch.move, {
      touches: [{
        clientX: 300,
      }],
    }));
    // assert class
    expect(aside.classes()).toContain('dragging');
    // offset is 100, so we remove it from the clientX, but we add the scrollX.
    assertWidth(wrapper, 255);
    // assert maxWidth
    document.dispatchEvent(createEvent(eventsMap.touch.move, {
      touches: [{
        clientX: window.innerWidth + 150,
      }],
    }));
    assertWidth(wrapper, maxWidth);
  });

  it('adds a transition detection', () => {
    const wrapper = createWrapper();
    const aside = wrapper.find('.aside');
    expect(aside.classes()).not.toContain('animating');
    aside.trigger('transitionstart');
    expect(aside.classes()).toContain('animating');
    aside.trigger('transitionend');
    expect(aside.classes()).not.toContain('animating');
  });
});
