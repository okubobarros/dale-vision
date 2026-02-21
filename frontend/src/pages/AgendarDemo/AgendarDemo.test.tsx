import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import AgendarDemo from "./AgendarDemo"
import { renderWithProviders } from "../../test/test-utils"
import { demoService } from "../../services/demo"

const toastError = vi.hoisted(() => vi.fn())

vi.mock("react-hot-toast", () => ({
  default: {
    error: toastError,
    success: vi.fn(),
  },
}))

vi.mock("../../services/demo", () => ({
  demoService: {
    createLead: vi.fn(),
  },
}))

const fillBaseRequired = async (
  user: ReturnType<typeof userEvent.setup>,
  options?: { skipOperators?: boolean }
) => {
  await user.type(screen.getByLabelText(/Seu nome \*/i), "Joao Silva")
  await user.type(screen.getByLabelText(/WhatsApp com DDD \*/i), "11999999999")
  await user.type(screen.getByLabelText(/E-mail \*/i), "joao@empresa.com")

  await user.selectOptions(
    screen.getByLabelText(/Quantas lojas você opera hoje\? \*/i),
    "1"
  )
  await user.selectOptions(
    screen.getByLabelText(/Quantidade total de Câmeras\? \*/i),
    "1-3"
  )

  await user.click(
    screen.getByLabelText(/Falta de padronização na execução entre unidades/i)
  )

  await user.click(screen.getByLabelText(/Reduzir perdas \/ fraudes/i))

  await user.selectOptions(
    screen.getByLabelText(/Onde a DaleVision irá rodar em sua loja\? \*/i),
    "store_pc"
  )
  if (!options?.skipOperators) {
    await user.selectOptions(
      screen.getByLabelText(/Operadores terão acesso se rodar no computador\? \*/i),
      "yes"
    )
  }
  await user.selectOptions(
    screen.getByLabelText(/Quem terá acesso para ajudar na ativação\? \*/i),
    "owner"
  )

  await user.selectOptions(
    screen.getByLabelText(/Onde você conheceu a Dale Vision\? \*/i),
    "google"
  )

  await user.click(
    screen.getByLabelText(/Concordo em receber comunicações/i)
  )
}

describe("AgendarDemo", () => {
  const originalLocation = window.location

  beforeEach(() => {
    toastError.mockClear()
    vi.mocked(demoService.createLead).mockReset()
    // @ts-expect-error test override
    delete window.location
    // @ts-expect-error test override
    window.location = { href: "" }
  })

  afterEach(() => {
    // @ts-expect-error test override
    delete window.location
    // @ts-expect-error test override
    window.location = originalLocation
  })

  it("bloqueia envio quando Segmento é Outros e 'Qual?' está vazio", async () => {
    vi.mocked(demoService.createLead).mockResolvedValue({ id: "lead123" })
    renderWithProviders(<AgendarDemo />)
    const user = userEvent.setup()

    await user.selectOptions(screen.getByLabelText(/Segmento \/ tipo de operação \*/i), "other")

    await fillBaseRequired(user)

    await user.click(
      screen.getByRole("button", { name: /Ver horários disponíveis/i })
    )

    expect(demoService.createLead).not.toHaveBeenCalled()
    expect(toastError).toHaveBeenCalledWith(
      'Preencha "Qual?" (segmento da operação).'
    )
  }, 10000)

  it("permite envio quando Segmento é Outros e 'Qual?' preenchido", async () => {
    vi.mocked(demoService.createLead).mockResolvedValue({ id: "lead123" })
    renderWithProviders(<AgendarDemo />)
    const user = userEvent.setup()

    await user.selectOptions(
      screen.getByLabelText(/Segmento \/ tipo de operação \*/i),
      "other"
    )
    await user.type(screen.getByLabelText(/Qual\? \*/i), "Bazar")

    await fillBaseRequired(user)

    await user.click(
      screen.getByRole("button", { name: /Ver horários disponíveis/i })
    )

    expect(demoService.createLead).toHaveBeenCalled()
  }, 10000)

  it("não exibe o bloco de Infraestrutura atual (opcional)", () => {
    renderWithProviders(<AgendarDemo />)
    expect(screen.queryByText(/Infraestrutura atual/i)).not.toBeInTheDocument()
    expect(
      screen.queryByLabelText(/Faixa de câmeras \(aprox\.\)/i)
    ).not.toBeInTheDocument()
  })

  it("permite selecionar múltiplos desafios e mostra 'Outro' quando selecionado", async () => {
    renderWithProviders(<AgendarDemo />)
    const user = userEvent.setup()

    await user.selectOptions(
      screen.getByLabelText(/Quantas lojas você opera hoje\? \*/i),
      "2-5"
    )

    await user.click(
      screen.getByLabelText(/Falta de padronização na execução entre unidades/i)
    )
    await user.click(
      screen.getByLabelText(/Ocorrências sem histórico centralizado/i)
    )
    await user.click(
      screen.getAllByLabelText(/^Outro$/i, { selector: 'input[type="checkbox"]' })[0]
    )

    expect(screen.getByLabelText(/Outro \(desafios\) \*/i)).toBeInTheDocument()
  })

  it("bloqueia submit multilojista quando 'Outro' sem texto", async () => {
    vi.mocked(demoService.createLead).mockResolvedValue({ id: "lead123" })
    renderWithProviders(<AgendarDemo />)
    const user = userEvent.setup()

    await user.selectOptions(
      screen.getByLabelText(/Segmento \/ tipo de operação \*/i),
      "gelateria"
    )
    await fillBaseRequired(user)

    await user.selectOptions(
      screen.getByLabelText(/Quantas lojas você opera hoje\? \*/i),
      "2-5"
    )

    await user.click(
      screen.getAllByLabelText(/^Outro$/i, { selector: 'input[type="checkbox"]' })[0]
    )

    await user.click(
      screen.getByRole("button", { name: /Ver horários disponíveis/i })
    )

    expect(demoService.createLead).not.toHaveBeenCalled()
    expect(toastError).toHaveBeenCalledWith('Preencha "Outro" (desafios).')
  }, 10000)

  it("bloqueia envio quando Operadores terão acesso não foi selecionado", async () => {
    vi.mocked(demoService.createLead).mockResolvedValue({ id: "lead123" })
    renderWithProviders(<AgendarDemo />)
    const user = userEvent.setup()

    await user.selectOptions(
      screen.getByLabelText(/Segmento \/ tipo de operação \*/i),
      "gelateria"
    )

    await fillBaseRequired(user, { skipOperators: true })

    await user.click(
      screen.getByRole("button", { name: /Ver horários disponíveis/i })
    )

    expect(demoService.createLead).not.toHaveBeenCalled()
    expect(toastError).toHaveBeenCalledWith(
      "Informe se operadores terão acesso ao computador."
    )
  }, 10000)

  it("permite envio sem preencher local da loja piloto", async () => {
    vi.mocked(demoService.createLead).mockResolvedValue({ id: "lead123" })
    renderWithProviders(<AgendarDemo />)
    const user = userEvent.setup()

    await user.selectOptions(
      screen.getByLabelText(/Segmento \/ tipo de operação \*/i),
      "bakery"
    )

    await fillBaseRequired(user)

    await user.click(
      screen.getByRole("button", { name: /Ver horários disponíveis/i })
    )

    await waitFor(() => {
      expect(demoService.createLead).toHaveBeenCalled()
    })
  }, 10000)
})
