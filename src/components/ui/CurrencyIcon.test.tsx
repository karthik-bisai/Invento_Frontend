import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CurrencyIcon } from './CurrencyIcon'

describe('CurrencyIcon', () => {
  it('renders Rupee icon for INR', () => {
    const { container } = render(<CurrencyIcon currency="INR" className="test-cls" />)
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
    expect(svg).toHaveClass('test-cls')
  })

  it('renders Dollar icon for USD', () => {
    const { container } = render(<CurrencyIcon currency="USD" />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('renders Euro icon for EUR', () => {
    const { container } = render(<CurrencyIcon currency="EUR" />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('renders Pound icon for GBP', () => {
    const { container } = render(<CurrencyIcon currency="GBP" />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('renders symbol or code for other currencies like AED or SAR', () => {
    render(<CurrencyIcon currency="AED" />)
    expect(screen.getByText('AED')).toBeInTheDocument()
  })
})
