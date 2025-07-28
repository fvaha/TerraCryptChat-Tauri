package xyz.terracrypt.chat.screens

import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.foundation.Image
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.AccountCircle
import androidx.compose.material.icons.filled.DarkMode
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Security
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.unit.dp
import androidx.core.net.toUri
import androidx.navigation.NavHostController
import coil.compose.rememberAsyncImagePainter
import kotlinx.coroutines.launch
import xyz.terracrypt.chat.managers.SessionManager
import xyz.terracrypt.chat.row.SettingRow
import xyz.terracrypt.chat.viewmodels.UserViewModel

/* ------------------------------------------------------------------ */
/*                               Screen                               */
/* ------------------------------------------------------------------ */
@Composable
fun SettingsScreen(
    navController: NavHostController,
    userViewModel: UserViewModel,
    sessionManager: SessionManager
) {
    val context = LocalContext.current
    val scope   = rememberCoroutineScope()

    /* ----- global state flows ------------------------------------- */
    val scrollState            = rememberScrollState()
    val isDarkMode             by sessionManager.isDarkModeEnabled.collectAsState()
    val rustSdkEncryption      by sessionManager.useRustSdkEncryption.collectAsState()
    val isLoading              by userViewModel.isLoading.collectAsState()

    /* ----- one-off ui state --------------------------------------- */
    var showEditAccount by rememberSaveable { mutableStateOf(false) }
    var isLoggingOut    by remember {        mutableStateOf(false)  }
    var selectedImage   by rememberSaveable { mutableStateOf<Uri?>(null) }

    /* ----- launchers ---------------------------------------------- */
    val pickImage = rememberLauncherForActivityResult(
        ActivityResultContracts.GetContent()
    ) { uri -> selectedImage = uri }

    /* ----- version ------------------------------------------------- */
    val versionName = remember {
        try {
            context.packageManager.getPackageInfo(context.packageName, 0).versionName
        } catch (_: PackageManager.NameNotFoundException) {
            "Unknown"
        } ?: "Unknown"
    }

    /* ============================================================= */
    /*                             UI                                */
    /* ============================================================= */
    Surface(Modifier.fillMaxSize()) {
        Column(
            modifier = Modifier
                .verticalScroll(scrollState)
                .padding(16.dp)
                .fillMaxSize(),
            verticalArrangement = Arrangement.Top
        ) {
            Text("Settings", style = MaterialTheme.typography.headlineMedium)
            Spacer(Modifier.height(24.dp))

            /* --------------- Edit account ---------------------- */
            SettingRow("Edit Account", Icons.Default.AccountCircle) {
                Text(
                    if (showEditAccount) "Hide" else "Edit",
                    modifier = Modifier
                        .clickable { showEditAccount = !showEditAccount }
                        .padding(8.dp)
                )
            }

            AnimatedVisibility(
                visible = showEditAccount,
                enter   = fadeIn()
            ) {
                EditAccountSection(
                    userViewModel = userViewModel,
                    selectedImage = selectedImage,
                    onPickImage   = { pickImage.launch("image/*") },
                    onRemoveImage = { selectedImage = null },
                    isLoading     = isLoading
                )
            }

            Spacer(Modifier.height(16.dp))

            /* --------------- dark / light ---------------------- */
            ThemeSection(isDarkMode) {
                scope.launch { sessionManager.toggleDarkMode() }
            }

            /* --------------- encryption toggle ----------------- */
            EncryptionSection(
                rustSdkEncryption
            ) { enabled ->
                scope.launch { sessionManager.setRustSdkEncryptionEnabled(enabled) }
            }

            /* --------------- language -------------------------- */
            LanguageSection()

            /* --------------- static links / about -------------- */
            StaticLinksSection(context, versionName)

            Spacer(Modifier.height(24.dp))

            /* --------------- logout ---------------------------- */
            Button(
                onClick = {
                    scope.launch {
                        isLoggingOut = true
                        sessionManager.logOut()
                        navController.navigate("login") {
                            popUpTo("settings") { inclusive = true }
                        }
                    }
                },
                enabled = !isLoggingOut,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(50.dp)
            ) {
                if (isLoggingOut) {
                    CircularProgressIndicator(Modifier.size(24.dp))
                } else {
                    Icon(Icons.AutoMirrored.Filled.Logout, contentDescription = null)
                    Spacer(Modifier.width(8.dp))
                    Text("Logout")
                }
            }

            Spacer(Modifier.height(12.dp))

            /* --------------- clear cache ----------------------- */
            Button(
                onClick = {
                    scope.launch {
                        userViewModel.clearCache()
                        Toast.makeText(
                            context,
                            "Cache cleared successfully!",
                            Toast.LENGTH_SHORT
                        ).show()
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(50.dp)
            ) {
                Icon(Icons.Default.Delete, contentDescription = null)
                Spacer(Modifier.width(8.dp))
                Text("Clear Cache")
            }
        }
    }
}

/* ------------------------------------------------------------------ */
/*                       Edit-Account section                         */
/* ------------------------------------------------------------------ */
@Composable
private fun EditAccountSection(
    userViewModel: UserViewModel,
    selectedImage: Uri?,
    onPickImage: () -> Unit,
    onRemoveImage: () -> Unit,
    isLoading: Boolean
) {
    /* ---- initial values (from flows) ----------------------------- */
    val nameFlow     by userViewModel.name.collectAsState()
    val userFlow     by userViewModel.username.collectAsState()
    val emailFlow    by userViewModel.email.collectAsState()

    /* ---- local text-field state (survives rotation) -------------- */
    var nameState by rememberSaveable(stateSaver = TextFieldValue.Saver) {
        mutableStateOf(TextFieldValue(nameFlow))
    }
    var userState by rememberSaveable(stateSaver = TextFieldValue.Saver) {
        mutableStateOf(TextFieldValue(userFlow))
    }
    var emailState by rememberSaveable(stateSaver = TextFieldValue.Saver) {
        mutableStateOf(TextFieldValue(emailFlow))
    }

    /* ---- keep local states in sync if server pushes new data ----- */
    LaunchedEffect(nameFlow)  { if (nameFlow  != nameState.text)  nameState  = TextFieldValue(nameFlow) }
    LaunchedEffect(userFlow)  { if (userFlow  != userState.text)  userState  = TextFieldValue(userFlow) }
    LaunchedEffect(emailFlow) { if (emailFlow != emailState.text) emailState = TextFieldValue(emailFlow) }

    /* ---- layout --------------------------------------------------- */
    Column(Modifier.fillMaxWidth()) {
        Spacer(Modifier.height(12.dp))

        Box(Modifier.fillMaxWidth(), Alignment.Center) {
            if (selectedImage != null) {
                Image(
                    painter = rememberAsyncImagePainter(selectedImage),
                    contentDescription = null,
                    modifier = Modifier
                        .size(100.dp)
                        .clickable { onRemoveImage() }
                )
            } else {
                Icon(
                    Icons.Default.AccountCircle, contentDescription = null,
                    modifier = Modifier
                        .size(100.dp)
                        .clickable { onPickImage() }
                )
            }
        }

        Spacer(Modifier.height(16.dp))

        OutlinedTextField(
            value = nameState,
            onValueChange = { nameState = it },
            label = { Text("Name") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth()
        )

        Spacer(Modifier.height(8.dp))

        OutlinedTextField(
            value = userState,
            onValueChange = { userState = it },
            label = { Text("Username") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth()
        )

        Spacer(Modifier.height(8.dp))

        OutlinedTextField(
            value = emailState,
            onValueChange = { emailState = it },
            label = { Text("Email") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth()
        )

        Spacer(Modifier.height(12.dp))

        Button(
            onClick = {
                /* push to VM once */
                userViewModel.setName(nameState.text.trim())
                userViewModel.setUsername(userState.text.trim())
                userViewModel.setEmail(emailState.text.trim())
                userViewModel.updateProfile()
            },
            enabled = !isLoading,
            modifier = Modifier.fillMaxWidth()
        ) {
            if (isLoading) {
                CircularProgressIndicator(Modifier.size(20.dp))
            } else {
                Text("Save Changes")
            }
        }

        Spacer(Modifier.height(24.dp))
    }
}

/* ------------------------------------------------------------------ */
/*                       Individual setting rows                      */
/* ------------------------------------------------------------------ */
@Composable
private fun ThemeSection(isDark: Boolean, toggle: () -> Unit) {
    SettingRow("Dark Mode", Icons.Default.DarkMode) {
        Switch(isDark, onCheckedChange = { toggle() })
    }
}

@Composable
private fun EncryptionSection(
    enabled: Boolean,
    toggle: (Boolean) -> Unit
) {
    SettingRow("TerraCrypt SDK Encryption", Icons.Default.Security) {
        Switch(enabled, onCheckedChange = toggle)
    }
}

@Composable
private fun LanguageSection() {
    var expanded by remember { mutableStateOf(false) }
    var selected by rememberSaveable { mutableStateOf("English") }

    SettingRow("Language", Icons.Default.Language) {
        Box {
            Text(
                selected,
                modifier = Modifier
                    .clickable { expanded = true }
                    .padding(8.dp)
            )
            DropdownMenu(
                expanded = expanded,
                onDismissRequest = { expanded = false }
            ) {
                listOf("English", "Spanish", "French", "German").forEach { lang ->
                    DropdownMenuItem(
                        text = { Text(lang) },
                        onClick = {
                            selected = lang
                            expanded = false
                        }
                    )
                }
            }
        }
    }
}

@Composable
private fun StaticLinksSection(context: android.content.Context, version: String) {
    SettingRow("Privacy Policy", Icons.Default.Lock) {
        Text(
            "View",
            modifier = Modifier
                .clickable {
                    context.startActivity(
                        Intent(Intent.ACTION_VIEW,
                            "https://terracrypt.cc/privacy.html".toUri())
                    )
                }
                .padding(8.dp)
        )
    }

    SettingRow("About", Icons.Default.Info) {
        Text(
            "Website",
            modifier = Modifier
                .clickable {
                    context.startActivity(
                        Intent(Intent.ACTION_VIEW,
                            "https://terracrypt.cc".toUri())
                    )
                }
                .padding(8.dp)
        )
    }

    SettingRow("App Version", Icons.Default.Settings) {
        Text(version)
    }
}
