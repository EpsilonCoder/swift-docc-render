/**
 * This source file is part of the Swift.org open source project
 *
 * Copyright (c) 2021 Apple Inc. and the Swift project authors
 * Licensed under Apache License v2.0 with Runtime Library Exception
 *
 * See https://swift.org/LICENSE.txt for license information
 * See https://swift.org/CONTRIBUTORS.txt for Swift project authors
*/

import { shallowMount } from '@vue/test-utils';
import { getSetting } from 'docc-render/utils/theme-settings';
import DocumentationTopic from 'docc-render/components/DocumentationTopic.vue';
import Language from 'docc-render/constants/Language';
import { TopicTypes } from '@/constants/TopicTypes';

jest.mock('docc-render/utils/theme-settings', () => ({
  getSetting: jest.fn((_, fallback) => fallback),
}));

const {
  Abstract,
  ContentNode,
  DefaultImplementations,
  Aside,
  Description,
  DownloadButton,
  TechnologyList,
  LanguageSwitcher,
  OnThisPageNav,
  PrimaryContent,
  Relationships,
  RequirementMetadata,
  Availability,
  SeeAlso,
  Summary,
  Topics,
  Title,
  BetaLegalText,
} = DocumentationTopic.components;

const foo = {
  type: 'paragraph',
  inlineContent: [
    {
      type: 'text',
      text: 'foo',
    },
  ],
};

const abstract = {
  type: 'text',
  text: 'Abstract text',
};

const deprecationSummary = [
  {
    type: 'paragraph',
    inlineContent: [
      {
        type: 'text',
        text: 'This feature is deprecated and should not be used in modern macOS apps.',
      },
    ],
  },
];

const downloadNotAvailableSummary = [
  {
    type: 'paragraph',
    inlineContent: [
      {
        type: 'text',
        text: 'You can experiment with the code. Just use ',
      },
      {
        type: 'reference',
        isActive: true,
        identifier: 'doc://com.example.documentation/documentation/arkit/xcode',
      },
      {
        type: 'text',
        text: ' on your Mac to download ',
      },
      {
        type: 'emphasis',
        inlineContent: [
          {
            type: 'text',
            text: 'Occluding Virtual Content with People.',
          },
        ],
      },
    ],
  },
];

const sampleCodeDownload = {
  title: 'Download',
  action: {
    isActive: true,
    overridingTitle: 'Download',
    type: 'reference',
  },
};

const propsData = {
  abstract: [abstract],
  conformance: { constraints: [], availabilityPrefx: [] },
  hierarchy: {
    paths: [
      [
        'topic://foo',
        'topic://bar',
      ],
    ],
  },
  identifier: 'doc://fookit',
  interfaceLanguage: 'swift',
  symbolKind: TopicTypes.module,
  objcPath: 'documentation/objc',
  swiftPath: 'documentation/swift',
  primaryContentSections: [
    {
      kind: PrimaryContent.constants.SectionKind.content,
      content: [foo],
    },
  ],
  references: {},
  roleHeading: 'Thing',
  title: 'FooKit',
  languagePaths: {
    occ: ['documentation/objc'],
    swift: ['documentation/swift'],
  },
  tags: [
    {
      type: 'foo',
    },
  ],
};

describe('DocumentationTopic', () => {
  /** @type {import('@vue/test-utils').Wrapper} */
  let wrapper;

  beforeEach(() => {
    wrapper = shallowMount(DocumentationTopic, { propsData });
  });

  it('provides a page title based on title prop', () => {
    const titleText = `${propsData.title} | Documentation`;

    expect(document.title).toBe(titleText);
  });

  it('provides a page description based on the abstract text', () => {
    const abstractText = propsData.abstract[0].text;

    expect(document.querySelector('meta[name="description"]').content).toBe(abstractText);
  });

  it('provides the languages', () => {
    // eslint-disable-next-line no-underscore-dangle
    expect(wrapper.vm._provided.languages).toEqual(new Set(['occ', 'swift']));
  });

  it('provides the interface languages', () => {
    // eslint-disable-next-line no-underscore-dangle
    expect(wrapper.vm._provided.interfaceLanguage).toEqual(propsData.interfaceLanguage);
  });

  it('provides `references', () => {
    // eslint-disable-next-line no-underscore-dangle
    expect(wrapper.vm._provided.references).toEqual(propsData.references);
  });

  it('provides the languages', () => {
    // eslint-disable-next-line no-underscore-dangle
    expect(wrapper.vm._provided.languages).toEqual(new Set(['occ', 'swift']));
  });

  it('provides the interface languages', () => {
    // eslint-disable-next-line no-underscore-dangle
    expect(wrapper.vm._provided.interfaceLanguage).toEqual(propsData.interfaceLanguage);
  });

  it('provides the symbol kind', () => {
    // eslint-disable-next-line no-underscore-dangle
    expect(wrapper.vm._provided.symbolKind).toEqual(propsData.symbolKind);
  });

  it('renders a root div', () => {
    expect(wrapper.is('div.doc-topic')).toBe(true);
  });

  it('renders a <main>', () => {
    const main = wrapper.find('main');
    expect(main.exists()).toBe(true);
    expect(main.classes('main')).toBe(true);
    expect(main.attributes('id')).toBe('main');
    expect(main.attributes('role')).toBe('main');
    expect(main.attributes('tabindex')).toBe('0');
  });

  it('renders a `Title`', () => {
    const title = wrapper.find(Title);
    expect(title.exists()).toBe(true);
    expect(title.props('eyebrow')).toBe(propsData.roleHeading);
    expect(title.text()).toBe(propsData.title);
  });

  it('renders an abstract', () => {
    const descr = wrapper.find(Description);
    const abstractComponent = descr.find(Abstract);
    expect(abstractComponent.exists()).toBe(true);
    expect(abstractComponent.props('content')).toEqual(propsData.abstract);
  });

  it('renders an abstract, with an empty string inside', () => {
    const emptyParagraph = [{
      type: 'paragraph',
      inlineContent: [
        {
          type: 'text',
          text: '',
        },
      ],
    }];
    wrapper.setProps({
      abstract: emptyParagraph,
    });
    const descr = wrapper.find(Description);
    const abstractComponent = descr.find(Abstract);
    expect(abstractComponent.exists()).toBe(true);
    expect(abstractComponent.props('content')).toEqual(emptyParagraph);
  });

  it('renders a `.content-grid` with `Description`/`Summary and PrimaryContent` columns', () => {
    const grid = wrapper.find('.content-grid.container');
    expect(grid.exists()).toBe(true);

    const description = grid.find(Description);
    expect(description.exists()).toBe(true);

    const summary = grid.find(Summary);
    expect(summary.exists()).toBe(true);

    expect(grid.find(PrimaryContent).exists()).toBe(true);
  });

  it('renders a `PrimaryContent`', () => {
    const primary = wrapper.find(PrimaryContent);
    expect(primary.exists()).toBe(true);
    expect(primary.props('conformance')).toEqual(propsData.conformance);
    expect(primary.props('sections')).toEqual(propsData.primaryContentSections);
  });

  it('does not render a `PrimaryContent` column when passed undefined as PrimaryContent', () => {
    wrapper.setProps({ primaryContentSections: undefined });
    expect(wrapper.contains(PrimaryContent)).toBe(false);
  });

  it('does not render a `PrimaryContent` column when passed empty an PrimaryContent', () => {
    wrapper.setProps({ primaryContentSections: [] });
    expect(wrapper.contains(PrimaryContent)).toBe(false);
  });

  describe('description column', () => {
    it('renders a deprecated `Aside` when deprecated', () => {
      expect(wrapper.contains(Aside)).toBe(false);
      wrapper.setProps({ deprecationSummary });

      const aside = wrapper.find(Aside);
      expect(aside.exists()).toBe(true);
      expect(aside.props('kind')).toEqual('deprecated');

      const content = aside.find(ContentNode);
      expect(content.exists()).toBe(true);
      expect(content.props('content')).toEqual(deprecationSummary);
    });

    it('renders a note `Aside` when download button is not available', () => {
      expect(wrapper.contains(Aside)).toBe(false);
      wrapper.setProps({ downloadNotAvailableSummary });

      const aside = wrapper.find(Aside);
      expect(aside.exists()).toBe(true);
      expect(aside.props('kind')).toEqual('note');

      const content = aside.find(ContentNode);
      expect(content.exists()).toBe(true);
      expect(content.props('content')).toEqual(downloadNotAvailableSummary);
    });

    it('renders a `DownloadButton` if there is sample code to download', () => {
      expect(wrapper.contains(DownloadButton)).toBe(false);
      wrapper.setProps({ sampleCodeDownload });
      expect(wrapper.contains(DownloadButton)).toBe(true);
    });

    it('renders a `RequirementMetadata` if the symbol is required', () => {
      expect(wrapper.contains(RequirementMetadata)).toBe(false);
      wrapper.setProps({ isRequirement: true });
      expect(wrapper.contains(RequirementMetadata)).toBe(true);
    });
  });

  describe('summary column', () => {
    let summary;

    beforeEach(() => {
      summary = wrapper.find('main .container').find(Summary);
    });

    it('hides the Summary, if the global settings say so', () => {
      // this should really only mock the resolved value for the specific flag,
      // but this is fine for now
      getSetting.mockResolvedValueOnce(true);
      wrapper = shallowMount(DocumentationTopic, { propsData });
      expect(wrapper.find(Summary).exists()).toBe(false);
    });

    it('renders a `Availability` with platforms data', () => {
      const platforms = [
        {
          introducedAt: '1.0',
          name: 'fooOS',
        },
        {
          deprecatedAt: '2.0',
          introducedAt: '1.0',
          name: 'barOS',
        },
      ];
      wrapper.setProps({ platforms });

      const list = summary.find(Availability);
      expect(list.exists()).toBe(true);
      expect(list.props('platforms')).toEqual(platforms);
    });

    it('renders a `TechnologyList` with technologies data', () => {
      const modules = ['FooKit', 'BarKit'];
      wrapper.setProps({ modules });

      const list = summary.find(TechnologyList);
      expect(list.exists()).toBe(true);
      expect(list.props('technologies')).toEqual(modules);
    });

    it('renders an `OnThisPageNav` with more than 1 section', () => {
      const onThisPageSections = [
        { anchor: 'foo', title: 'Foo' },
        { anchor: 'bar', title: 'Bar' },
      ];
      wrapper.setData({ topicState: { onThisPageSections } });

      const nav = summary.find(OnThisPageNav);
      expect(nav.exists()).toBe(true);
      expect(nav.props('sections')).toEqual(onThisPageSections);
    });

    it('does not render `OnThisPage` with 1 or fewer sections', () => {
      const onThisPageSections = [{ anchor: 'foo', title: 'Foo' }];
      wrapper.setData({ topicState: { onThisPageSections } });
      expect(summary.contains(OnThisPageNav)).toBe(false);

      wrapper.setData({ topicState: { onThisPageSections: [] } });
      expect(summary.contains(OnThisPageNav)).toBe(false);
    });

    it('renders a `LanguageSwitcher`', () => {
      const switcher = summary.find(LanguageSwitcher);
      expect(switcher.exists()).toBe(true);
      expect(switcher.props()).toEqual({
        interfaceLanguage: propsData.interfaceLanguage,
        objcPath: propsData.languagePaths.occ[0],
        swiftPath: propsData.languagePaths.swift[0],
      });
    });

    it('renders an `TechnologyList` component in the sidebar', () => {
      expect(wrapper.find('.extends-technology').exists()).toBe(false);
      const extendsTechnology = 'FooTechnology';

      wrapper.setProps({
        extendsTechnology,
      });

      const technologyList = wrapper.find('.extends-technology');
      expect(technologyList.exists()).toBe(true);
      expect(technologyList.props()).toEqual({
        technologies: [{ name: extendsTechnology }],
        title: 'Extends',
      });
    });
  });

  it('renders `Topics` if there are topic sections', () => {
    expect(wrapper.contains(Topics)).toBe(false);

    const topicSections = [
      {
        title: 'Foobar',
        identifiers: [
          'foo',
          'bar',
        ],
      },
      {
        title: 'Baz',
        identifiers: ['baz'],
      },
    ];
    wrapper.setProps({ topicSections });

    const topics = wrapper.find(Topics);
    expect(topics.exists()).toBe(true);
    expect(topics.props('sections')).toBe(topicSections);
  });

  it('renders `SeeAlso` if there are see also sections', () => {
    expect(wrapper.contains(SeeAlso)).toBe(false);

    const seeAlsoSections = [
      {
        title: 'Foobar',
        identifiers: [
          'foo',
          'bar',
        ],
      },
      {
        title: 'Baz',
        identifiers: ['baz'],
      },
    ];
    wrapper.setProps({ seeAlsoSections });

    const seeAlso = wrapper.find(SeeAlso);
    expect(seeAlso.exists()).toBe(true);
    expect(seeAlso.props('sections')).toBe(seeAlsoSections);
  });

  it('renders `Relationships` if there are relationship sections', () => {
    expect(wrapper.contains(Relationships)).toBe(false);

    const relationshipsSections = [
      {
        type: 'inheritsFrom',
        title: 'Inherits From',
        identifiers: [
          'foo',
          'bar',
        ],
      },
      {
        type: 'conformsTo',
        title: 'Conforms To',
        identifiers: ['baz'],
      },
    ];
    wrapper.setProps({ relationshipsSections });

    const relationships = wrapper.find(Relationships);
    expect(relationships.exists()).toBe(true);
    expect(relationships.props('sections')).toBe(relationshipsSections);
  });

  it('renders `Relationships` before `SeeAlso`', () => {
    // There's probably a much better way of asserting the order of the
    // rendered components, but this was the only way I could think of doing it
    // without manually adding classes to the components in the actual
    // implementation. I'm stubbing out the components I care about to add a
    // common class that can be queried so that the ordering can be verified.
    const stubSection = klass => ({
      render: h => h('div', { class: `section-stub ${klass}` }),
    });
    wrapper = shallowMount(DocumentationTopic, {
      propsData: {
        ...propsData,
        relationshipsSections: [
          { type: 'inheritsFrom', title: 'Inherits From', identifiers: [] },
        ],
        seeAlsoSections: [
          { title: 'Related Documentation', identifiers: [] },
        ],
      },
      stubs: {
        Relationships: stubSection('relationships'),
        SeeAlso: stubSection('see-also'),
      },
    });
    const sections = wrapper.findAll('.section-stub');
    expect(sections.at(0).classes('relationships')).toBe(true);
    expect(sections.at(1).classes('see-also')).toBe(true);
  });

  it('renders `DefaultImplementations` if there are default implementation sections', () => {
    expect(wrapper.contains(DefaultImplementations)).toBe(false);

    const defaultImplementationsSections = [
      {
        title: 'Foobar',
        identifiers: [
          'foo',
          'bar',
        ],
      },
      {
        title: 'Baz',
        identifiers: ['baz'],
      },
    ];
    wrapper.setProps({ defaultImplementationsSections });

    const defaults = wrapper.find(DefaultImplementations);
    expect(defaults.exists()).toBe(true);
    expect(defaults.props('sections')).toEqual(defaultImplementationsSections);
  });

  it('computes isSymbolBeta', () => {
    const topicSections = [{}];
    wrapper.setProps({ topicSections, isSymbolBeta: true });

    const topics = wrapper.find(Topics);
    expect(topics.props('isSymbolBeta')).toBe(true);

    // should not if only one is beta
    wrapper.setProps({
      isSymbolBeta: false,
    });
    expect(topics.props('isSymbolBeta')).toBe(false);
  });

  it('renders a beta legal text warning if at least one platform is in beta', async () => {
    expect(wrapper.find(BetaLegalText).exists()).toBe(false);
    wrapper.setProps({
      platforms: [
        {
          introducedAt: '1.0',
          name: 'fooOS',
          beta: true,
        },
        {
          introducedAt: '1.0',
          name: 'fooOSS',
        },
      ],
    });
    expect(wrapper.find(BetaLegalText).exists()).toBe(true);
  });

  it('sends isSymbolDeprecated down to the Topic', () => {
    wrapper.setProps({ topicSections: [{}], isSymbolDeprecated: false });
    const topics = wrapper.find(Topics);
    expect(topics.props('isSymbolDeprecated')).toBe(false);
    wrapper.setProps({ isSymbolDeprecated: true });
    expect(topics.props('isSymbolDeprecated')).toBe(true);
  });

  it('renders content in the `above-title` slot', () => {
    wrapper = shallowMount(DocumentationTopic, {
      propsData,
      slots: {
        'above-title': 'Above Title Content',
      },
    });
    expect(wrapper.text()).toContain('Above Title Content');
  });

  describe('lifecycle hooks', () => {
    it('calls `store.reset()`', () => {
      const store = {
        reset: jest.fn(),
        state: { onThisPageSections: [], apiChanges: null },
      };
      wrapper = shallowMount(DocumentationTopic, {
        propsData,
        provide: { store },
      });
      expect(store.reset).toBeCalled();
    });

    it('routes to the objc variant of a page if that is the preferred language', async () => {
      const $route = { query: {} };
      const $router = { replace: jest.fn() };
      const store = {
        reset: () => {},
        state: {
          apiChanges: null,
          onThisPageSections: [],
          preferredLanguage: Language.objectiveC.key.url,
        },
      };
      wrapper = shallowMount(DocumentationTopic, {
        mocks: {
          $route,
          $router,
        },
        propsData,
        provide: { store },
      });
      await wrapper.vm.$nextTick();
      expect($router.replace).toBeCalledWith({
        path: `/${propsData.languagePaths.occ[0]}`,
        query: { language: Language.objectiveC.key.url },
      });
    });
  });
});
