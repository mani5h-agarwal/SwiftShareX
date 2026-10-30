/**
 * @format
 */

import React from 'react';
import { Text } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import SendConfirmationModal from '../src/modals/SendConfirmationModal';

const texts = (renderer: ReactTestRenderer.ReactTestRenderer) =>
  renderer.root
    .findAllByType(Text)
    .map(node => [node.props.children].flat().join(''));

const render = async (names: string[], onRemove = () => {}) => {
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <SendConfirmationModal
        visible
        files={names.map(name => ({
          name,
          uri: `file:///${name}`,
          size: 2048,
        }))}
        onConfirm={() => {}}
        onCancel={() => {}}
        onRemove={onRemove}
      />,
    );
  });
  return renderer!;
};

test('lists every file name in a batch', async () => {
  const renderer = await render(['a.mov', 'b.pdf', 'c.jpeg']);

  const shown = texts(renderer);
  expect(shown).toEqual(expect.arrayContaining(['a.mov', 'b.pdf', 'c.jpeg']));
  expect(shown).toContain('Send 3 Files?');
  expect(shown).toContain('6.0 KB in total');
  expect(shown.filter(text => text === 'Ready to send')).toHaveLength(3);
});

test('removes the chosen file from a batch', async () => {
  const onRemove = jest.fn();
  const renderer = await render(['a.mov', 'b.pdf'], onRemove);

  renderer.root
    .findByProps({ accessibilityLabel: 'Remove b.pdf' })
    .props.onPress();
  expect(onRemove).toHaveBeenCalledWith(1);
});

test('keeps the single file layout for one file', async () => {
  const renderer = await render(['a.mov']);

  const shown = texts(renderer);
  expect(shown).toContain('a.mov');
  expect(shown).toContain('Send File?');
  expect(shown).toContain('2.0 KB');
  expect(
    renderer.root.findAllByProps({ accessibilityLabel: 'Remove a.mov' }),
  ).toHaveLength(0);
});
