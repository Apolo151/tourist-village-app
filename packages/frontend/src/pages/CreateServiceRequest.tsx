import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import {
    Box,
    Typography,
    Paper,
    Button,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Alert,
    Container,
    CircularProgress,
    Grid,
    Card,
    CardContent,
    Chip,
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import {
    ArrowBack as ArrowBackIcon,
    Save as SaveIcon,
    Cancel as CancelIcon,
} from "@mui/icons-material";
import { useAuth } from "../context/AuthContext";
import { serviceRequestService } from "../services/serviceRequestService";
import type {
    ServiceType,
    CreateServiceRequestRequest,
} from "../services/serviceRequestService";
import { apartmentService } from "../services/apartmentService";
import type { Apartment } from "../services/apartmentService";
import { bookingService } from "../services/bookingService";
import type { Booking } from "../services/bookingService";
import { userService } from "../services/userService";
import type { User } from "../services/userService";
import SearchableDropdown from "../components/SearchableDropdown";

export interface CreateServiceRequestProps {
    apartmentId?: number;
    bookingId?: number;
    whoPays?: "owner" | "renter" | "company"; // Restrict whoPays to allowed values
    onSuccess?: () => void;
    onCancel?: () => void;
    lockApartment?: boolean;
    disableEditMode?: boolean; // Add this prop to disable edit mode when used in dialogs
    lockProject?: boolean;
    lockPhase?: boolean;
    requesterId?: number;
    lockBooking?: boolean;
}

export default function CreateServiceRequest({
    apartmentId,
    bookingId,
    whoPays,
    onSuccess,
    onCancel,
    lockApartment,
    disableEditMode,
    lockProject,
    lockPhase,
    requesterId,
    lockBooking,
}: CreateServiceRequestProps) {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { currentUser } = useAuth();
    const { id } = useParams<{ id: string }>();
    
    // Only use route parameter id for edit mode when not disabled
    const editId = disableEditMode ? null : id;

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // Data states
    const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
    const [apartments, setApartments] = useState<Apartment[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [users, setUsers] = useState<User[]>([]);

    // Form data
    const [formData, setFormData] = useState<
        Omit<CreateServiceRequestRequest, "requester_id" | "who_pays"> & {
            requester_id?: number;
            who_pays: "owner" | "renter" | "company";
        }
    >({
        type_id: 0,
        apartment_id: apartmentId || 0,
        booking_id: bookingId,
        requester_id: currentUser?.id,
        date_action: undefined,
        status: "Created",
        who_pays: whoPays ?? "owner", // Use the passed whoPays or default to owner
        notes: "",
        assignee_id: undefined,
        cost: undefined,
        currency: undefined,
    });

    // Filter states for easier apartment selection
    const [projectFilter, setProjectFilter] = useState(''); // Village filter
    const [phaseFilter, setPhaseFilter] = useState('');

    // Load initial data
    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                setError(null);

                const [serviceTypesData, apartmentsData, usersData] =
                    await Promise.all([
                        serviceRequestService.getServiceTypes({ limit: 100 }),
                        apartmentService.getApartments({ limit: 100 }),
                        userService.getUsers({ limit: 100 }),
                    ]);

                setServiceTypes(serviceTypesData.data);
                setApartments(apartmentsData.data);
                setUsers(usersData.data);

                // Pre-select service type if provided in URL
                const serviceTypeId = searchParams.get("serviceTypeId");
                if (serviceTypeId) {
                    const serviceType = serviceTypesData.data.find(
                        (st) => st.id === parseInt(serviceTypeId)
                    );
                    if (serviceType) {
                        setFormData((prev) => ({
                            ...prev,
                            type_id: serviceType.id,
                        }));
                    }
                }
            } catch (err) {
                setError(
                    err instanceof Error ? err.message : "Failed to load data"
                );
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [searchParams]);

    // Load bookings when apartment is selected
    useEffect(() => {
        const loadBookings = async () => {
            if (!formData.apartment_id) {
                setBookings([]);
                return;
            }

            try {
                const bookingsData = await bookingService.getBookings({
                    apartment_id: formData.apartment_id,
                    limit: 50,
                });
                setBookings(bookingsData.bookings || []);
            } catch (err) {
                console.error("Failed to load bookings:", err);
                setBookings([]);
            }
        };

        loadBookings();
    }, [formData.apartment_id]);

    // Set who_pays based on booking when bookingId is provided and bookings are loaded
    useEffect(() => {
        if (bookingId && bookings.length > 0) {
            const selectedBooking = bookings.find((b) => b.id === bookingId);
            if (selectedBooking) {
                setFormData((prev) => ({
                    ...prev,
                    who_pays:
                        selectedBooking.user_type === "owner"
                            ? "owner"
                            : "renter",
                    booking_id: bookingId, // Ensure the booking_id is set correctly
                }));
            }
        } else if (whoPays) {
            // If whoPays is passed directly (e.g., from the booking), use it
            setFormData(prev => ({
                ...prev,
                who_pays: whoPays
            }));
        }
    }, [bookingId, bookings, whoPays]);

    // Prefill form in edit mode
    useEffect(() => {
        const fetchAndPrefill = async () => {
            if (!editId) return;
            try {
                setLoading(true);
                setError(null);
                const data = await serviceRequestService.getServiceRequestById(
                    Number(editId)
                );
                setFormData({
                    type_id: data.type_id,
                    apartment_id: data.apartment_id,
                    booking_id: data.booking_id,
                    requester_id: data.requester_id,
                    date_action: data.date_action,
                    status: data.status,
                    who_pays: data.who_pays,
                    notes: data.notes,
                    assignee_id: data.assignee_id,
                    cost: data.cost,
                    currency: data.currency,
                });
            } catch (err) {
                setError("Failed to load service request for editing");
            } finally {
                setLoading(false);
            }
        };
        fetchAndPrefill();
    }, [editId]);

    // Prefill requester_id if requesterId prop is provided
    useEffect(() => {
      if (requesterId && (!formData.requester_id || formData.requester_id !== requesterId)) {
        setFormData(prev => ({ ...prev, requester_id: requesterId }));
      }
    }, [requesterId]);

    // Auto-set project and phase filters when apartment is selected
    useEffect(() => {
        if (formData.apartment_id && apartments.length > 0) {
            const selectedApartment = apartments.find(apt => apt.id === formData.apartment_id);
            if (selectedApartment?.village) {
                setProjectFilter(selectedApartment.village.id.toString());
                setPhaseFilter(selectedApartment.phase.toString());
            }
        }
    }, [formData.apartment_id, apartments]);

    // Effect to prefill cost with default village pricing when service type and apartment are selected
    useEffect(() => {
        const prefillDefaultCost = () => {
            if (!formData.type_id || !formData.apartment_id) {
                // Clear cost fields if service type or apartment is not selected
                setFormData(prev => ({
                    ...prev,
                    cost: undefined,
                    currency: undefined
                }));
                return;
            }

            // Don't override if user has already set custom cost
            if (formData.cost !== undefined && formData.currency !== undefined) {
                return;
            }

            const selectedServiceType = serviceTypes.find(st => st.id === formData.type_id);
            const selectedApartment = apartments.find(apt => apt.id === formData.apartment_id);

            if (selectedServiceType && selectedApartment?.village_id && selectedServiceType.village_prices) {
                const villagePrice = selectedServiceType.village_prices.find(vp => vp.village_id === selectedApartment.village_id);
                
                if (villagePrice) {
                    setFormData(prev => ({
                        ...prev,
                        cost: villagePrice.cost,
                        currency: villagePrice.currency
                    }));
                } else if (selectedServiceType.village_prices.length > 0) {
                    // Fallback to first available price
                    const firstPrice = selectedServiceType.village_prices[0];
                    setFormData(prev => ({
                        ...prev,
                        cost: firstPrice.cost,
                        currency: firstPrice.currency
                    }));
                }
            } else if (selectedServiceType?.cost && selectedServiceType?.currency) {
                // Backward compatibility fallback
                setFormData(prev => ({
                    ...prev,
                    cost: selectedServiceType.cost,
                    currency: selectedServiceType.currency
                }));
            }
        };

        prefillDefaultCost();
    }, [formData.type_id, formData.apartment_id, serviceTypes, apartments]);

    // Clear cost when service type or apartment changes (to allow new defaults)
    const handleServiceTypeChange = (event: SelectChangeEvent) => {
        handleSelectChange(event, 'type_id');
        // Clear custom cost to allow new defaults
        setFormData(prev => ({
            ...prev,
            cost: undefined,
            currency: undefined
        }));
    };

    const handleApartmentChange = (value: string | number | null) => {
        handleSelectChange(
            {
                target: {
                    value: value?.toString() || "",
                },
            } as SelectChangeEvent,
            "apartment_id"
        );
        // Clear custom cost to allow new defaults
        setFormData(prev => ({
            ...prev,
            cost: undefined,
            currency: undefined
        }));
    };

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = event.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSelectChange = (
        event: SelectChangeEvent,
        fieldName: string
    ) => {
        const value = event.target.value;
        let parsedValue: any = value;

        // Parse numeric values
        if (
            [
                "type_id",
                "apartment_id",
                "booking_id",
                "assignee_id",
                "requester_id",
            ].includes(fieldName)
        ) {
            parsedValue = value ? parseInt(value) : undefined;
        }

        setFormData((prev) => ({
            ...prev,
            [fieldName]: parsedValue,
        }));

        // When apartment changes, reset booking selection
        if (fieldName === "apartment_id") {
            setFormData((prev) => ({
                ...prev,
                booking_id: undefined,
            }));
        }
    };

    const handleDateChange = (date: Date | null) => {
        setFormData((prev) => ({
            ...prev,
            date_action: date ? date.toISOString() : undefined,
        }));
    };

    const handleProjectFilterChange = (event: SelectChangeEvent) => {
        setProjectFilter(event.target.value);
        // Reset phase and apartment when project changes
        setPhaseFilter('');
        setFormData(prev => ({
            ...prev,
            apartment_id: 0
        }));
    };

    const handlePhaseFilterChange = (event: SelectChangeEvent) => {
        setPhaseFilter(event.target.value);
        // Reset apartment when phase changes
        setFormData(prev => ({
            ...prev,
            apartment_id: 0
        }));
    };

    const handleSubmit = async () => {
        try {
            setSubmitting(true);
            setError(null);

            // Validate required fields
            if (
                !formData.type_id ||
                !formData.apartment_id ||
                !formData.requester_id
            ) {
                setError(
                    "Please select service type, apartment, and requester"
                );
                return;
            }

            if (!currentUser) {
                setError("User not authenticated");
                return;
            }

            const requestData: CreateServiceRequestRequest = {
                ...formData,
                requester_id: formData.requester_id!,
                type_id: formData.type_id,
                apartment_id: formData.apartment_id,
            };

            if (editId) {
                // Edit mode - update existing service request
                await serviceRequestService.updateServiceRequest(
                    Number(editId),
                    requestData
                );
            } else {
                // Create mode - create new service request
                await serviceRequestService.createServiceRequest(requestData);
            }

            if (onSuccess) {
                onSuccess();
            } else {
                navigate("/services?tab=0"); // Navigate to service requests tab
            }
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Failed to save service request"
            );
        } finally {
            setSubmitting(false);
        }
    };

    const handleCancel = () => {
        if (onCancel) {
            onCancel();
        } else {
            navigate("/services");
        }
    };

    const getSelectedServiceType = () => {
        return serviceTypes.find((st) => st.id === formData.type_id);
    };

    const getSelectedApartment = () => {
        return apartments.find((apt) => apt.id === formData.apartment_id);
    };

    const getSelectedRequester = () => {
        return users.find((user) => user.id === formData.requester_id);
    };

    // Helper functions for project and phase filtering
    const getUniqueVillages = () => {
        const villages = apartments.map(apt => apt.village).filter(Boolean);
        const uniqueVillages = villages.filter((village, index, self) => 
            index === self.findIndex(v => v?.id === village?.id)
        );
        return uniqueVillages;
    };

    const getAvailablePhases = () => {
        if (!projectFilter) return [];
        const selectedVillageId = parseInt(projectFilter);
        const apartmentsInVillage = apartments.filter(apt => apt.village?.id === selectedVillageId);
        const phases = [...new Set(apartmentsInVillage.map(apt => apt.phase))].sort((a, b) => a - b);
        return phases;
    };

    const getFilteredApartments = () => {
        let filteredApartments = apartments;
        
        if (projectFilter) {
            const selectedVillageId = parseInt(projectFilter);
            filteredApartments = filteredApartments.filter(apt => apt.village?.id === selectedVillageId);
        }
        
        if (phaseFilter) {
            const selectedPhase = parseInt(phaseFilter);
            filteredApartments = filteredApartments.filter(apt => apt.phase === selectedPhase);
        }
        
        return filteredApartments;
    };

    // When lockApartment and apartmentId are set, set project and phase filters and lock them
    useEffect(() => {
        if (lockApartment && apartmentId && apartments.length > 0) {
            const apt = apartments.find(a => a.id === apartmentId);
            if (apt) {
                setProjectFilter(apt.village?.id?.toString() || '');
                setPhaseFilter(apt.phase?.toString() || '');
            }
        }
    }, [lockApartment, apartmentId, apartments]);

    if (loading) {
        return (
            <Container maxWidth="md">
                <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
                    <CircularProgress />
                </Box>
            </Container>
        );
    }

    if (error && serviceTypes.length === 0) {
        return (
            <Container maxWidth="md">
                <Alert severity="error" sx={{ mt: 4 }}>
                    {error}
                </Alert>
                <Button
                    startIcon={<ArrowBackIcon />}
                    onClick={handleCancel}
                    sx={{ mt: 2 }}
                >
                    Back to Services
                </Button>
            </Container>
        );
    }

    const selectedServiceType = getSelectedServiceType();
    const selectedApartment = getSelectedApartment();
    const selectedRequester = getSelectedRequester();

    return (
        <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Container maxWidth="md">
                <Box sx={{ mb: 4, mt: 3 }}>
                    {/* Header */}
                    <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
                        <Button
                            variant="text"
                            color="primary"
                            startIcon={<ArrowBackIcon />}
                            onClick={handleCancel}
                        >
                            Back
                        </Button>
                        <Typography variant="h4" sx={{ ml: 2 }}>
                            Request Service
                        </Typography>
                    </Box>

                    {error && (
                        <Alert severity="error" sx={{ mb: 3 }}>
                            {error}
                        </Alert>
                    )}

                    {/* Service Type Selection */}
                    <Paper sx={{ p: 3, mb: 3 }}>
                        <Typography variant="h6" gutterBottom>
                            Service Details
                        </Typography>

                        <Grid container spacing={3}>
                            <Grid size={{ xs: 12 }}>
                                <FormControl fullWidth required>
                                    <InputLabel>Service Type</InputLabel>
                                    <Select
                                        value={
                                            formData.type_id?.toString() || ""
                                        }
                                        label="Service Type"
                                        onChange={handleServiceTypeChange}
                                    >
                                        <MenuItem value="">
                                            <em>Select a service type</em>
                                        </MenuItem>
                                        {serviceTypes.map((serviceType) => (
                                            <MenuItem
                                                key={serviceType.id}
                                                value={serviceType.id.toString()}
                                            >
                                                <Box
                                                    sx={{
                                                        display: "flex",
                                                        justifyContent:
                                                            "space-between",
                                                        alignItems: "center",
                                                        width: "100%",
                                                    }}
                                                >
                                                    <span>
                                                        {serviceType.name}
                                                    </span>
                                                    <Chip
                                                        label={
                                                            (() => {
                                                                if (formData.apartment_id) {
                                                                    const apartment = apartments.find(a => a.id === formData.apartment_id);
                                                                    if (apartment?.village_id && serviceType.village_prices) {
                                                                        const villagePrice = serviceType.village_prices.find(vp => vp.village_id === apartment.village_id);
                                                                        if (villagePrice) {
                                                                            return `${villagePrice.cost} ${villagePrice.currency}`;
                                                                        }
                                                                    }
                                                                }
                                                                // Fallback to first available price
                                                                if (serviceType.village_prices && serviceType.village_prices.length > 0) {
                                                                    const firstPrice = serviceType.village_prices[0];
                                                                    return `${firstPrice.cost} ${firstPrice.currency}`;
                                                                }
                                                                return serviceType.cost && serviceType.currency ? `${serviceType.cost} ${serviceType.currency}` : 'No pricing';
                                                            })()
                                                        }
                                                        size="small"
                                                        color="primary"
                                                        variant="outlined"
                                                    />
                                                </Box>
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                        </Grid>
                    </Paper>

                    {/* Location and Booking */}
                    <Paper sx={{ p: 3, mb: 3 }}>
                        <Typography variant="h6" gutterBottom>
                            Location & Booking
                        </Typography>

                        <Grid container spacing={3}>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <FormControl fullWidth required>
                                    <InputLabel>Project</InputLabel>
                                    <Select
                                        value={projectFilter}
                                        label="Project"
                                        onChange={handleProjectFilterChange}
                                        disabled={!!lockApartment || !!lockProject}
                                    >
                                        <MenuItem value="">
                                            <em>Select a project</em>
                                        </MenuItem>
                                        {getUniqueVillages().map(village => (
                                            <MenuItem key={village!.id} value={village!.id.toString()}>
                                                {village!.name}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>

                            <Grid size={{ xs: 12, sm: 6 }}>
                                <FormControl fullWidth>
                                    <InputLabel>Phase</InputLabel>
                                    <Select
                                        value={phaseFilter}
                                        label="Phase"
                                        onChange={handlePhaseFilterChange}
                                        disabled={!projectFilter || !!lockApartment || !!lockPhase}
                                    >
                                        <MenuItem value="">
                                            <em>All Phases</em>
                                        </MenuItem>
                                        {getAvailablePhases().map(phase => (
                                            <MenuItem key={phase} value={phase.toString()}>
                                                Phase {phase}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>

                            <Grid size={{ xs: 12 }}>
                                <SearchableDropdown
                                    options={getFilteredApartments().map((apartment) => ({
                                        id: apartment.id,
                                        label: `${apartment.name} - Phase ${apartment.phase}`,
                                        name: apartment.name,
                                        village: apartment.village,
                                        phase: apartment.phase,
                                    }))}
                                    value={formData.apartment_id || null}
                                    onChange={handleApartmentChange}
                                    label="Apartment"
                                    placeholder="Search apartments by name..."
                                    required
                                    disabled={
                                        lockApartment &&
                                        apartmentId !== undefined
                                    }
                                    getOptionLabel={(option) => option.label}
                                    renderOption={(props, option) => (
                                        <li {...props}>
                                            <Box>
                                                <Typography variant="body1">
                                                    {option.name}
                                                </Typography>
                                                <Typography
                                                    variant="body2"
                                                    color="text.secondary"
                                                >
                                                    {option.village?.name} - Phase {option.phase}
                                                </Typography>
                                            </Box>
                                        </li>
                                    )}
                                />
                            </Grid>

                            {formData.apartment_id && bookings.length > 0 && (
                                <Grid size={{ xs: 12 }}>
                                    <FormControl fullWidth>
                                        <InputLabel>
                                            Related Booking (Optional)
                                        </InputLabel>
                                        <Select
                                            value={
                                                formData.booking_id?.toString() ||
                                                ""
                                            }
                                            label="Related Booking (Optional)"
                                            onChange={(e) =>
                                                handleSelectChange(
                                                    e,
                                                    "booking_id"
                                                )
                                            }
                                            disabled={!!lockBooking}
                                        >
                                            <MenuItem value="">
                                                <em>No related booking</em>
                                            </MenuItem>
                                            {(bookings || []).map((booking) => (
                                                <MenuItem
                                                    key={booking.id}
                                                    value={booking.id.toString()}
                                                >
                                                    {booking.user?.name} -{" "}
                                                    {new Date(
                                                        booking.arrival_date
                                                    ).toLocaleDateString()}{" "}
                                                    to{" "}
                                                    {new Date(
                                                        booking.leaving_date
                                                    ).toLocaleDateString()}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>
                            )}

                            {selectedApartment && (
                                <Grid size={{ xs: 12 }}>
                                    <Card variant="outlined">
                                        <CardContent>
                                            <Typography
                                                variant="subtitle1"
                                                gutterBottom
                                            >
                                                {selectedApartment.name}
                                            </Typography>
                                            <Typography
                                                variant="body2"
                                                color="text.secondary"
                                            >
                                                Project: {selectedApartment.village?.name}
                                            </Typography>
                                            <Typography
                                                variant="body2"
                                                color="text.secondary"
                                            >
                                                Phase: {selectedApartment.phase}
                                            </Typography>
                                            <Typography
                                                variant="body2"
                                                color="text.secondary"
                                            >
                                                Owner: {selectedApartment.owner?.name}
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            )}
                        </Grid>
                    </Paper>

                    {/* Service Request Details */}
                    <Paper sx={{ p: 3, mb: 3 }}>
                        <Typography variant="h6" gutterBottom>
                            Request Details
                        </Typography>

                        <Grid container spacing={3}>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <DateTimePicker
                                    label="Service Date (When should the service be done?)"
                                    value={
                                        formData.date_action
                                            ? new Date(formData.date_action)
                                            : null
                                    }
                                    onChange={handleDateChange}
                                    slotProps={{
                                        textField: {
                                            fullWidth: true,
                                        },
                                    }}
                                />
                            </Grid>

                            <Grid size={{ xs: 12, sm: 6 }}>
                                <FormControl fullWidth required>
                                    <InputLabel>Who Pays</InputLabel>
                                    <Select
                                        value={formData.who_pays}
                                        label="Who Pays"
                                        onChange={(e) =>
                                            handleSelectChange(e, "who_pays")
                                        }
                                    >
                                        <MenuItem value="owner">Owner</MenuItem>
                                        <MenuItem value="renter">
                                            Tenant
                                        </MenuItem>
                                        <MenuItem value="company">
                                            Company
                                        </MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>

                            <Grid size={{ xs: 12, sm: 6 }}>
                                <SearchableDropdown
                                    options={users.map((user) => ({
                                        id: user.id,
                                        label: `${user.name} (${user.role})`,
                                        name: user.name,
                                        role: user.role,
                                    }))}
                                    value={formData.requester_id || null}
                                    onChange={(value) =>
                                        handleSelectChange(
                                            {
                                                target: {
                                                    value:
                                                        value?.toString() || "",
                                                },
                                            } as SelectChangeEvent,
                                            "requester_id"
                                        )
                                    }
                                    label="Requester"
                                    placeholder="Search users by name..."
                                    required
                                    getOptionLabel={(option) => option.label}
                                    renderOption={(props, option) => (
                                        <li {...props}>
                                            <Box>
                                                <Typography variant="body1">
                                                    {option.name}
                                                </Typography>
                                                <Typography
                                                    variant="body2"
                                                    color="text.secondary"
                                                >
                                                    {option.role}
                                                </Typography>
                                            </Box>
                                        </li>
                                    )}
                                />
                            </Grid>

                            <Grid size={{ xs: 12, sm: 6 }}>
                                <FormControl fullWidth>
                                    <InputLabel>Status</InputLabel>
                                    <Select
                                        value={formData.status}
                                        label="Status"
                                        onChange={(e) =>
                                            handleSelectChange(e, "status")
                                        }
                                    >
                                        <MenuItem value="Created">
                                            Created
                                        </MenuItem>
                                        <MenuItem value="In Progress">
                                            In Progress
                                        </MenuItem>
                                        <MenuItem value="Done">Done</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>

                            {/* Cost Override Section */}
                            <Grid size={{ xs: 12 }}>
                                <Typography variant="subtitle2" gutterBottom>
                                    Service Cost
                                </Typography>
                                
                                {/* Show current default cost */}
                                {formData.type_id && formData.apartment_id && (
                                    <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                                        <Typography variant="body2" color="text.secondary" gutterBottom>
                                            Default Cost for {selectedServiceType?.name} in {selectedApartment?.village?.name}:
                                        </Typography>
                                        <Typography variant="h6" color="primary">
                                            {(() => {
                                                if (selectedServiceType && selectedApartment?.village_id && selectedServiceType.village_prices) {
                                                    const villagePrice = selectedServiceType.village_prices.find(vp => vp.village_id === selectedApartment.village_id);
                                                    if (villagePrice) {
                                                        return `${villagePrice.cost} ${villagePrice.currency}`;
                                                    }
                                                }
                                                if (selectedServiceType?.village_prices && selectedServiceType.village_prices.length > 0) {
                                                    const firstPrice = selectedServiceType.village_prices[0];
                                                    return `${firstPrice.cost} ${firstPrice.currency}`;
                                                }
                                                return selectedServiceType?.cost && selectedServiceType?.currency 
                                                    ? `${selectedServiceType.cost} ${selectedServiceType.currency}`
                                                    : 'No pricing available';
                                            })()}
                                        </Typography>
                                    </Box>
                                )}

                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                    Override the default cost if needed:
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                                    <TextField
                                        label="Custom Cost"
                                        type="number"
                                        value={formData.cost || ''}
                                        onChange={(e) => setFormData(prev => ({ 
                                            ...prev, 
                                            cost: e.target.value ? parseFloat(e.target.value) : undefined 
                                        }))}
                                        placeholder={(() => {
                                            if (selectedServiceType && selectedApartment?.village_id && selectedServiceType.village_prices) {
                                                const villagePrice = selectedServiceType.village_prices.find(vp => vp.village_id === selectedApartment.village_id);
                                                if (villagePrice) return villagePrice.cost.toString();
                                            }
                                            if (selectedServiceType?.village_prices && selectedServiceType.village_prices.length > 0) {
                                                return selectedServiceType.village_prices[0].cost.toString();
                                            }
                                            return selectedServiceType?.cost?.toString() || 'Enter cost';
                                        })()}
                                        inputProps={{ min: 0, step: 0.01 }}
                                        sx={{ flex: 1 }}
                                        helperText="Leave empty to use default pricing"
                                    />
                                    <FormControl sx={{ minWidth: 120 }}>
                                        <InputLabel>Currency</InputLabel>
                                        <Select
                                            value={formData.currency || ''}
                                            label="Currency"
                                            onChange={(e) => setFormData(prev => ({ 
                                                ...prev, 
                                                currency: e.target.value as 'EGP' | 'GBP' || undefined 
                                            }))}
                                        >
                                            <MenuItem value="">
                                                <em>Default ({(() => {
                                                    if (selectedServiceType && selectedApartment?.village_id && selectedServiceType.village_prices) {
                                                        const villagePrice = selectedServiceType.village_prices.find(vp => vp.village_id === selectedApartment.village_id);
                                                        if (villagePrice) return villagePrice.currency;
                                                    }
                                                    if (selectedServiceType?.village_prices && selectedServiceType.village_prices.length > 0) {
                                                        return selectedServiceType.village_prices[0].currency;
                                                    }
                                                    return selectedServiceType?.currency || 'EGP';
                                                })()})</em>
                                            </MenuItem>
                                            <MenuItem value="EGP">EGP</MenuItem>
                                            <MenuItem value="GBP">GBP</MenuItem>
                                        </Select>
                                    </FormControl>
                                    {(formData.cost !== undefined || formData.currency !== undefined) && (
                                        <Button
                                            variant="outlined"
                                            size="small"
                                            onClick={() => setFormData(prev => ({
                                                ...prev,
                                                cost: undefined,
                                                currency: undefined
                                            }))}
                                            sx={{ mt: 1 }}
                                        >
                                            Reset to Default
                                        </Button>
                                    )}
                                </Box>
                            </Grid>

                            <Grid size={{ xs: 12 }}>
                                <TextField
                                    label="Notes (Optional)"
                                    name="notes"
                                    value={formData.notes}
                                    onChange={handleInputChange}
                                    fullWidth
                                    multiline
                                    rows={4}
                                    placeholder="Add any additional notes or special instructions..."
                                />
                            </Grid>
                        </Grid>
                    </Paper>

                    {/* Summary */}
                    {formData.type_id &&
                        formData.apartment_id &&
                        formData.requester_id && (
                            <Card>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom>
                                        Request Summary
                                    </Typography>
                                    <Box
                                        sx={{
                                            display: "grid",
                                            gridTemplateColumns: {
                                                xs: "1fr",
                                                sm: "repeat(2, 1fr)",
                                            },
                                            gap: 2,
                                        }}
                                    >
                                        <Box>
                                            <Typography
                                                variant="subtitle2"
                                                color="text.secondary"
                                            >
                                                Service
                                            </Typography>
                                            <Typography variant="body1">
                                                {selectedServiceType?.name}
                                            </Typography>
                                        </Box>
                                        <Box>
                                            <Typography
                                                variant="subtitle2"
                                                color="text.secondary"
                                            >
                                                Cost
                                            </Typography>
                                            <Typography variant="body1">
                                                {(() => {
                                                    // If custom cost is set, show it
                                                    if (formData.cost !== undefined && formData.currency !== undefined) {
                                                        return `${formData.cost.toFixed(2)} ${formData.currency} (Custom)`;
                                                    }
                                                    
                                                    // If only cost is custom, show mixed
                                                    if (formData.cost !== undefined) {
                                                        const defaultCurrency = (() => {
                                                            if (selectedServiceType && selectedApartment?.village_id && selectedServiceType.village_prices) {
                                                                const villagePrice = selectedServiceType.village_prices.find(vp => vp.village_id === selectedApartment.village_id);
                                                                if (villagePrice) return villagePrice.currency;
                                                            }
                                                            if (selectedServiceType?.village_prices && selectedServiceType.village_prices.length > 0) {
                                                                return selectedServiceType.village_prices[0].currency;
                                                            }
                                                            return selectedServiceType?.currency || 'EGP';
                                                        })();
                                                        return `${formData.cost.toFixed(2)} ${defaultCurrency} (Custom Cost)`;
                                                    }
                                                    
                                                    // If only currency is custom, show mixed
                                                    if (formData.currency !== undefined) {
                                                        const defaultCost = (() => {
                                                            if (selectedServiceType && selectedApartment?.village_id && selectedServiceType.village_prices) {
                                                                const villagePrice = selectedServiceType.village_prices.find(vp => vp.village_id === selectedApartment.village_id);
                                                                if (villagePrice) return villagePrice.cost;
                                                            }
                                                            if (selectedServiceType?.village_prices && selectedServiceType.village_prices.length > 0) {
                                                                return selectedServiceType.village_prices[0].cost;
                                                            }
                                                            return selectedServiceType?.cost || 0;
                                                        })();
                                                        return `${defaultCost} ${formData.currency} (Custom Currency)`;
                                                    }
                                                    
                                                    // Otherwise show default village pricing
                                                    if (selectedServiceType && selectedApartment?.village_id && selectedServiceType.village_prices) {
                                                        const villagePrice = selectedServiceType.village_prices.find(vp => vp.village_id === selectedApartment.village_id);
                                                        if (villagePrice) {
                                                            return `${villagePrice.cost} ${villagePrice.currency} (Default)`;
                                                        }
                                                    }
                                                    // Fallback to first available price or backward compatibility
                                                    if (selectedServiceType?.village_prices && selectedServiceType.village_prices.length > 0) {
                                                        const firstPrice = selectedServiceType.village_prices[0];
                                                        return `${firstPrice.cost} ${firstPrice.currency} (Default)`;
                                                    }
                                                    return selectedServiceType?.cost && selectedServiceType?.currency 
                                                        ? `${selectedServiceType.cost} ${selectedServiceType.currency} (Default)`
                                                        : 'No pricing available';
                                                })()}
                                            </Typography>
                                        </Box>
                                        <Box>
                                            <Typography
                                                variant="subtitle2"
                                                color="text.secondary"
                                            >
                                                Apartment
                                            </Typography>
                                            <Typography variant="body1">
                                                {selectedApartment?.name}
                                            </Typography>
                                        </Box>
                                        <Box>
                                            <Typography
                                                variant="subtitle2"
                                                color="text.secondary"
                                            >
                                                Who Pays
                                            </Typography>
                                            <Typography variant="body1">
                                                {formData.who_pays
                                                    .charAt(0)
                                                    .toUpperCase() +
                                                    formData.who_pays.slice(1)}
                                            </Typography>
                                        </Box>
                                        {formData.requester_id && (
                                            <Box>
                                                <Typography
                                                    variant="subtitle2"
                                                    color="text.secondary"
                                                >
                                                    Requester
                                                </Typography>
                                                <Typography variant="body1">
                                                    {selectedRequester?.name} (
                                                    {selectedRequester?.role})
                                                </Typography>
                                            </Box>
                                        )}
                                        {formData.date_action && (
                                            <Box>
                                                <Typography
                                                    variant="subtitle2"
                                                    color="text.secondary"
                                                >
                                                    Service Date
                                                </Typography>
                                                <Typography variant="body1">
                                                    {new Date(
                                                        formData.date_action
                                                    ).toLocaleString()}
                                                </Typography>
                                            </Box>
                                        )}
                                    </Box>
                                </CardContent>
                            </Card>
                        )}

                    {/* Action Buttons */}
                    <Box
                        sx={{
                            mt: 4,
                            display: "flex",
                            gap: 2,
                            justifyContent: "flex-end",
                        }}
                    >
                        <Button
                            variant="outlined"
                            startIcon={<CancelIcon />}
                            onClick={handleCancel}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="contained"
                            startIcon={<SaveIcon />}
                            onClick={handleSubmit}
                            disabled={
                                submitting ||
                                !formData.type_id ||
                                !formData.apartment_id ||
                                !formData.requester_id
                            }
                        >
                            {submitting
                                ? editId
                                    ? "Saving..."
                                    : "Creating..."
                                : editId
                                ? "Edit Request"
                                : "Create Request"}
                        </Button>
                    </Box>
                </Box>
            </Container>
        </LocalizationProvider>
    );
}
