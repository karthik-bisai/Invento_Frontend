import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/api/client'
import { apiError, makeProfile, mockGet, signedIn } from '@/test/mockApi'
import { renderApp } from '@/test/render'
import type { User } from '@/types'
import { ProfilePage } from './ProfilePage'

async function setup(over: Partial<User> = {}) {
  signedIn()
  mockGet({ '/auth/me': makeProfile('INVENTORY_MANAGER', over) })
  renderApp(<ProfilePage />, ['/profile'])
  await screen.findByLabelText('Full name')
}

const png = (name = 'me.png', type = 'image/png', size = 1024) => new File([new Uint8Array(size)], name, { type })
const chooser = () => screen.getByLabelText('Choose a photo')

beforeEach(() => {
  Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:preview'), revokeObjectURL: vi.fn() })
})
afterEach(() => vi.restoreAllMocks())

describe('details', () => {
  it('shows the saved details, with email and role read-only', async () => {
    await setup({ full_name: 'Pat Lee', job_title: 'Stock lead', phone: '+44 20 7946 0000', email_verified: true })
    expect(screen.getByLabelText('Full name')).toHaveValue('Pat Lee')
    expect(screen.getByLabelText('Job title')).toHaveValue('Stock lead')
    expect(screen.getByLabelText('Phone')).toHaveValue('+44 20 7946 0000')
    expect(screen.getByLabelText('Email')).toBeDisabled()
    expect(screen.getByText('Verified')).toBeInTheDocument()
    expect(screen.getByText('Inventory Manager')).toBeInTheDocument()
    expect(screen.getByText('15 Jan 2026')).toBeInTheDocument()
  })

  it('keeps Save disabled until something changes, then saves only to the profile endpoint', async () => {
    await setup()
    const patch = vi.spyOn(api, 'patch').mockResolvedValue({ data: makeProfile('INVENTORY_MANAGER', { full_name: 'Pat Lee' }) } as never)
    const save = screen.getByRole('button', { name: 'Save changes' })
    expect(save).toBeDisabled()

    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Full name'), 'Pat Lee')
    expect(save).toBeEnabled()
    await user.click(save)

    await waitFor(() => expect(patch).toHaveBeenCalledWith('/auth/me', { full_name: 'Pat Lee', job_title: '', phone: '' }))
    expect(await screen.findByText('Saved')).toBeInTheDocument()
    expect(save).toBeDisabled() // nothing left to save
  })

  it('rejects a phone number with letters before it reaches the server', async () => {
    await setup()
    const patch = vi.spyOn(api, 'patch')
    await userEvent.setup().type(screen.getByLabelText('Phone'), 'call me')
    expect(screen.getByText('Use digits, spaces and + ( ) - . only.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled()
    expect(patch).not.toHaveBeenCalled()
  })

  it('shows the server’s reason when saving fails and keeps what was typed', async () => {
    await setup()
    vi.spyOn(api, 'patch').mockRejectedValue(apiError(422, 'phone: Enter a phone number using digits, spaces, + ( ) - .'))
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Job title'), 'Picker')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Enter a phone number')
    expect(screen.getByLabelText('Job title')).toHaveValue('Picker')
  })
})

describe('photo', () => {
  it('uploads a valid image and shows it', async () => {
    await setup()
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: makeProfile('INVENTORY_MANAGER', { avatar_url: 'http://localhost:4000/media/avatars/a.png' }) } as never)
    await userEvent.setup().upload(chooser(), png())

    await waitFor(() => expect(post).toHaveBeenCalledTimes(1))
    const [url, form] = post.mock.calls[0] as [string, FormData]
    expect(url).toBe('/auth/me/avatar')
    expect((form.get('file') as File).name).toBe('me.png')
    await waitFor(() => expect(document.querySelector('img')?.getAttribute('src')).toBe('http://localhost:4000/media/avatars/a.png'))
    expect(screen.getByRole('button', { name: 'Change photo' })).toBeInTheDocument()
  })

  it('refuses the wrong file type or an oversized file without uploading', async () => {
    await setup()
    const post = vi.spyOn(api, 'post')
    const user = userEvent.setup({ applyAccept: false })

    await user.upload(chooser(), png('anim.gif', 'image/gif'))
    expect(await screen.findByRole('alert')).toHaveTextContent('Use a PNG, JPEG or WebP image.')

    await user.upload(chooser(), png('huge.png', 'image/png', 2 * 1024 * 1024 + 1))
    expect(await screen.findByRole('alert')).toHaveTextContent('over 2 MB')
    expect(post).not.toHaveBeenCalled()
  })

  it('shows the server’s message when the upload is rejected', async () => {
    await setup()
    vi.spyOn(api, 'post').mockRejectedValue(apiError(415, 'Use a PNG, JPEG or WebP image.', 'unsupported_type'))
    await userEvent.setup().upload(chooser(), png())
    expect(await screen.findByRole('alert')).toHaveTextContent('Use a PNG, JPEG or WebP image.')
    expect(document.querySelector('img')).toBeNull() // the preview is dropped
  })

  it('removes an existing photo', async () => {
    await setup({ avatar_url: 'http://localhost:4000/media/avatars/a.png' })
    const del = vi.spyOn(api, 'delete').mockResolvedValue({ data: makeProfile('INVENTORY_MANAGER') } as never)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Remove photo' }))
    await waitFor(() => expect(del).toHaveBeenCalledWith('/auth/me/avatar'))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Upload photo' })).toBeInTheDocument())
  })

  it('offers no Remove button when there is no photo', async () => {
    await setup()
    expect(screen.queryByRole('button', { name: 'Remove photo' })).not.toBeInTheDocument()
  })

  it('falls back to initials when the picture fails to load', async () => {
    await setup({ full_name: 'Pat Lee', avatar_url: 'http://localhost:4000/media/avatars/gone.png' })
    const img = document.querySelector('img') as HTMLImageElement
    img.dispatchEvent(new Event('error'))
    await waitFor(() => expect(document.querySelector('img')).toBeNull())
    expect(within(screen.getByRole('region', { name: 'Photo' })).getByText('PL')).toBeInTheDocument()
  })
})
