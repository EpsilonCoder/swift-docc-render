/**
 * This source file is part of the Swift.org open source project
 *
 * Copyright (c) 2022 Apple Inc. and the Swift project authors
 * Licensed under Apache License v2.0 with Runtime Library Exception
 *
 * See https://swift.org/LICENSE.txt for license information
 * See https://swift.org/CONTRIBUTORS.txt for Swift project authors
*/

import NavigatorDataProvider from '@/components/Navigator/NavigatorDataProvider.vue';
import { shallowMount } from '@vue/test-utils';
import { fetchIndexPathsData } from 'docc-render/utils/data';
import Language from 'docc-render/constants/Language';
import { flushPromises } from '../../../../test-utils';

jest.mock('docc-render/utils/data');

const technology = {
  title: 'Technology Name',
  url: '/technology/path',
};

const swiftIndexOne = {
  id: 'foo',
  path: technology.url,
  children: [1, 2, 3],
};
const swiftIndexTwo = {
  id: 'bar',
  path: '/bar',
  children: [1],
};
const objectiveCIndexOne = {
  id: 'foo-objc',
  path: technology.url,
  children: [1],
};

const response = {
  interfaceLanguages: {
    [Language.swift.key.url]: [
      swiftIndexOne,
      swiftIndexTwo,
    ],
    [Language.objectiveC.key.url]: [
      objectiveCIndexOne,
    ],
  },
};

fetchIndexPathsData.mockResolvedValue(response);

const defaultProps = {
  technology,
};

let props = {};

const createWrapper = ({ propsData, ...others } = {}) => shallowMount(NavigatorDataProvider, {
  propsData: {
    ...defaultProps,
    ...propsData,
  },
  scopedSlots: {
    default: (p) => {
      props = p;
      return 'Text';
    },
  },
  ...others,
});

describe('NavigatorDataProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches data when mounting NavigatorDataProvider', async () => {
    expect(fetchIndexPathsData).toHaveBeenCalledTimes(0);
    createWrapper();
    expect(fetchIndexPathsData).toHaveBeenCalledTimes(1);
    expect(props).toHaveProperty('isFetching', true);
    await flushPromises();
    expect(props).toEqual({
      isFetching: false,
      technology: swiftIndexOne,
      errorFetching: false,
    });
  });

  it('sets errorFetching to true, when request errored', async () => {
    expect(fetchIndexPathsData).toHaveBeenCalledTimes(0);
    fetchIndexPathsData.mockRejectedValueOnce('Error');
    createWrapper();
    expect(fetchIndexPathsData).toHaveBeenCalledTimes(1);
    expect(props).toHaveProperty('isFetching', true);
    await flushPromises();
    expect(props).toEqual({
      isFetching: false,
      technology: undefined,
      errorFetching: true,
    });
  });

  it('returns objc data', async () => {
    expect(fetchIndexPathsData).toHaveBeenCalledTimes(0);
    createWrapper({
      propsData: {
        interfaceLanguage: Language.objectiveC.key.url,
      },
    });
    expect(fetchIndexPathsData).toHaveBeenCalledTimes(1);
    expect(props).toHaveProperty('isFetching', true);
    await flushPromises();
    expect(props).toEqual({
      errorFetching: false,
      isFetching: false,
      technology: objectiveCIndexOne,
    });
  });

  it('falls back to swift items, if no objc items', async () => {
    expect(fetchIndexPathsData).toHaveBeenCalledTimes(0);
    fetchIndexPathsData.mockResolvedValueOnce({
      interfaceLanguages: {
        [Language.swift.key.url]: response.interfaceLanguages[Language.swift.key.url],
      },
    });
    createWrapper({
      propsData: {
        interfaceLanguage: Language.objectiveC.key.url,
      },
    });
    expect(fetchIndexPathsData).toHaveBeenCalledTimes(1);
    expect(props).toHaveProperty('isFetching', true);
    await flushPromises();
    expect(props).toEqual({
      errorFetching: false,
      isFetching: false,
      technology: swiftIndexOne,
    });
  });

  it('returns undefined technology, if none matches', async () => {
    createWrapper({
      propsData: {
        technology: {
          path: '/foo',
        },
      },
    });
    await flushPromises();
    expect(props).toEqual({
      errorFetching: false,
      isFetching: false,
      technology: undefined,
    });
  });
});
