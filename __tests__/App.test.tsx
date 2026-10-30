/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';

test('renders correctly', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
  // async act lets startup work (e.g. the device name lookup) settle
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<App />);
  });

  expect(renderer?.root.findByProps({ children: 'Choose your action' })).toBeTruthy();

  // Unmount so nothing keeps running after the test environment is torn down
  await ReactTestRenderer.act(async () => {
    renderer?.unmount();
  });
});
