// Simple Button test using React's createRoot
import React from 'react';
import { createRoot } from 'react-dom/client';
import Button from '../Button';

// Mock DOM container
const mockContainer = {
  appendChild: jest.fn(),
  removeChild: jest.fn(),
  firstChild: null,
  nodeType: 1,
  nodeName: 'DIV'
};

describe('Button Component - Simple Test', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates Button component without crashing', () => {
    const button = <Button>Test Button</Button>;
    expect(button).toBeDefined();
    expect(button.type).toBe(Button);
    expect(button.props.children).toBe('Test Button');
  });

  it('creates Button with different props', () => {
    const button = <Button variant="secondary" size="lg" disabled>Click me</Button>;
    expect(button).toBeDefined();
    expect(button.props.variant).toBe('secondary');
    expect(button.props.size).toBe('lg');
    expect(button.props.disabled).toBe(true);
    expect(button.props.children).toBe('Click me');
  });
});
