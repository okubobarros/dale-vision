import { describe, it, expect, vi, beforeEach } from "vitest"
import { screen } from "@testing-library/react"
import { renderWithProviders } from "../../test/test-utils"
import CameraRoiEditor from "../CameraRoiEditor"

vi.mock("../../services/cameras", () => ({
  camerasService: {
    getRoi: vi.fn().mockResolvedValue({ config_json: {} }),
    getSnapshotUrl: vi.fn(),
    updateRoi: vi.fn(),
    uploadSnapshot: vi.fn(),
  },
}))

vi.mock("../../services/onboarding", () => ({
  onboardingService: {
    completeStep: vi.fn(),
  },
}))

describe("CameraRoiEditor snapshot rendering", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const baseCamera = {
    id: "cam-1",
    store: "store-1",
    name: "Entrada",
  }

  it("renders snapshot_url", async () => {
    const { camerasService } = await import("../../services/cameras")
    vi.mocked(camerasService.getSnapshotUrl).mockResolvedValueOnce({
      camera_id: "cam-1",
      snapshot_url: "https://cdn.test/snapshot.jpg",
    })

    renderWithProviders(
      <CameraRoiEditor open camera={baseCamera} canEditRoi onClose={() => {}} />
    )

    const img = await screen.findByAltText("Snapshot atual")
    expect(img).toHaveAttribute("src", "https://cdn.test/snapshot.jpg")
  })

  it("renders url field", async () => {
    const { camerasService } = await import("../../services/cameras")
    vi.mocked(camerasService.getSnapshotUrl).mockResolvedValueOnce({
      camera_id: "cam-1",
      url: "https://cdn.test/alt.jpg",
    })

    renderWithProviders(
      <CameraRoiEditor open camera={baseCamera} canEditRoi onClose={() => {}} />
    )

    const img = await screen.findByAltText("Snapshot atual")
    expect(img).toHaveAttribute("src", "https://cdn.test/alt.jpg")
  })

  it("renders snapshot_base64 as data url", async () => {
    const { camerasService } = await import("../../services/cameras")
    vi.mocked(camerasService.getSnapshotUrl).mockResolvedValueOnce({
      camera_id: "cam-1",
      snapshot_base64: "YmFzZTY0",
    })

    renderWithProviders(
      <CameraRoiEditor open camera={baseCamera} canEditRoi onClose={() => {}} />
    )

    const img = await screen.findByAltText("Snapshot atual")
    expect(img).toHaveAttribute("src", "data:image/jpeg;base64,YmFzZTY0")
  })
})
