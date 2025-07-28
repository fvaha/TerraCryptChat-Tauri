package xyz.terracrypt.chat.screens

import android.content.Intent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.DarkMode
import androidx.compose.material.icons.filled.LightMode
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
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
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.core.net.toUri
import androidx.navigation.NavHostController
import kotlinx.coroutines.launch
import xyz.terracrypt.chat.managers.SessionManager
import xyz.terracrypt.chat.utils.ValidationUtils.isValidEmail
import xyz.terracrypt.chat.viewmodels.UserViewModel

@Composable
fun RegistrationScreen(
    navController: NavHostController,
    userViewModel: UserViewModel,
    sessionManager: SessionManager,
    onRegistrationSuccess: () -> Unit
) {
    //MARK: observable state
    val isLoading  by userViewModel.isLoading.collectAsState()
    val errorMsg   by userViewModel.errorMessage.collectAsState()
    val isLoggedIn by userViewModel.isLoggedIn.collectAsState()
    val isDarkMode by sessionManager.isDarkModeEnabled.collectAsState()

    //MARK: local state
    val context = LocalContext.current
    val kb      = LocalSoftwareKeyboardController.current
    val scope   = rememberCoroutineScope()

    var username      by rememberSaveable { mutableStateOf(userViewModel.username.value) }
    var password      by rememberSaveable { mutableStateOf("") }
    var repeatPass    by rememberSaveable { mutableStateOf("") }
    var email         by rememberSaveable { mutableStateOf(userViewModel.email.value) }
    var showPass      by rememberSaveable { mutableStateOf(false) }
    var showRepeat    by rememberSaveable { mutableStateOf(false) }

    val userFR   = remember { FocusRequester() }
    val passFR   = remember { FocusRequester() }
    val repeatFR = remember { FocusRequester() }
    val emailFR  = remember { FocusRequester() }

    Surface(Modifier.fillMaxSize()) {
        Box(Modifier.fillMaxSize()) {

            //MARK: Form
            AnimatedVisibility(visible = true, enter = fadeIn()) {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(24.dp)
                        .verticalScroll(rememberScrollState())
                        .imePadding(),
                    verticalArrangement = Arrangement.Center,
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text("Register", style = MaterialTheme.typography.headlineMedium)
                    Spacer(Modifier.height(32.dp))

                    OutlinedTextField(
                        value = username,
                        onValueChange = { username = it },
                        label = { Text("Username *") },
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(
                            keyboardType = KeyboardType.Text,
                            imeAction    = ImeAction.Next
                        ),
                        keyboardActions = KeyboardActions(
                            onNext = { passFR.requestFocus() }
                        ),
                        modifier = Modifier
                            .fillMaxWidth()
                            .focusRequester(userFR)
                    )

                    Spacer(Modifier.height(8.dp))

                    OutlinedTextField(
                        value = password,
                        onValueChange = { password = it },
                        label = { Text("Password *") },
                        singleLine = true,
                        visualTransformation =
                            if (showPass) VisualTransformation.None
                            else PasswordVisualTransformation(),
                        trailingIcon = {
                            IconButton(onClick = { showPass = !showPass }) {
                                Icon(
                                    if (showPass) Icons.Default.VisibilityOff
                                    else           Icons.Default.Visibility,
                                    contentDescription = null
                                )
                            }
                        },
                        keyboardOptions = KeyboardOptions(
                            keyboardType = KeyboardType.Password,
                            imeAction    = ImeAction.Next
                        ),
                        keyboardActions = KeyboardActions(
                            onNext = { repeatFR.requestFocus() }
                        ),
                        modifier = Modifier
                            .fillMaxWidth()
                            .focusRequester(passFR)
                    )

                    Spacer(Modifier.height(8.dp))

                    OutlinedTextField(
                        value = repeatPass,
                        onValueChange = { repeatPass = it },
                        label = { Text("Repeat Password *") },
                        singleLine = true,
                        visualTransformation =
                            if (showRepeat) VisualTransformation.None
                            else PasswordVisualTransformation(),
                        trailingIcon = {
                            IconButton(onClick = { showRepeat = !showRepeat }) {
                                Icon(
                                    if (showRepeat) Icons.Default.VisibilityOff
                                    else           Icons.Default.Visibility,
                                    contentDescription = null
                                )
                            }
                        },
                        keyboardOptions = KeyboardOptions(
                            keyboardType = KeyboardType.Password,
                            imeAction    = ImeAction.Next
                        ),
                        keyboardActions = KeyboardActions(
                            onNext = { emailFR.requestFocus() }
                        ),
                        isError = repeatPass.isNotBlank() && repeatPass != password,
                        modifier = Modifier
                            .fillMaxWidth()
                            .focusRequester(repeatFR)
                    )

                    Spacer(Modifier.height(8.dp))

                    OutlinedTextField(
                        value = email,
                        onValueChange = { email = it },
                        label = { Text("Email *") },
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(
                            keyboardType = KeyboardType.Email,
                            imeAction    = ImeAction.Done
                        ),
                        keyboardActions = KeyboardActions(
                            onDone = { kb?.hide() }
                        ),
                        isError = email.isNotBlank() && !isValidEmail(email),
                        modifier = Modifier
                            .fillMaxWidth()
                            .focusRequester(emailFR)
                    )

                    Spacer(Modifier.height(12.dp))

                    //MARK: TOS link (bez checkboxa)
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            "Terms of Service",
                            color = MaterialTheme.colorScheme.primary,
                            modifier = Modifier
                                .clickable {
                                    context.startActivity(
                                        Intent(
                                            Intent.ACTION_VIEW,
                                            "https://terracrypt.cc/tos.html".toUri()
                                        )
                                    )
                                }
                        )
                    }

                    if (errorMsg.isNotBlank()) {
                        Text(
                            errorMsg,
                            color  = MaterialTheme.colorScheme.error,
                            style  = MaterialTheme.typography.bodySmall,
                            modifier = Modifier.padding(top = 8.dp)
                        )
                    }

                    Spacer(Modifier.height(24.dp))

                    Button(
                        onClick = {
                            when {
                                username.isBlank() ->
                                    userViewModel.setError("Username is required.")
                                password.isBlank() ->
                                    userViewModel.setError("Password is required.")
                                repeatPass.isBlank() ->
                                    userViewModel.setError("Repeat password.")
                                password != repeatPass ->
                                    userViewModel.setError("Passwords do not match.")
                                !isValidEmail(email) ->
                                    userViewModel.setError("Invalid email format.")
                                else -> {
                                    userViewModel.setUsername(username.trim())
                                    userViewModel.setPassword(password)
                                    userViewModel.setEmail(email.trim())
                                    userViewModel.register(context)
                                }
                            }
                        },
                        enabled = username.isNotBlank()
                                && password.isNotBlank()
                                && repeatPass.isNotBlank()
                                && email.isNotBlank(),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(50.dp)
                    ) {
                        if (isLoading) CircularProgressIndicator(Modifier.size(24.dp))
                        else           Text("Register")
                    }

                    Spacer(Modifier.height(16.dp))

                    TextButton(onClick = { navController.navigate("login") }) {
                        Text("Already have an account? Login")
                    }
                }
            }

            //MARK: Theme toggle
            IconButton(
                onClick = { scope.launch { sessionManager.toggleDarkMode() } },
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(16.dp)
            ) {
                Icon(
                    if (isDarkMode) Icons.Default.LightMode else Icons.Default.DarkMode,
                    contentDescription = null
                )
            }
        }
    }

    //MARK: navigate after auto-login
    LaunchedEffect(isLoggedIn) {
        if (isLoggedIn && userViewModel.user.value != null) onRegistrationSuccess()
    }
}
