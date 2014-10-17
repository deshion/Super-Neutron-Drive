from django import forms
from django.contrib import admin

from .models import User

class UserForm (forms.ModelForm):
  set_password = forms.CharField(
    label='Set Password',
    widget=forms.PasswordInput(attrs={'class': 'vTextField'}),
    required=False,
    help_text='leave blank to keep the same',
  )
  
  class Meta:
    model = User
    fields = (
      'username',
      'email',
      'verified',
      'newsletter',
      'first_name',
      'last_name',
      'is_staff',
      'is_active',
      'is_superuser',
      'groups',
    )
    
class UserAdmin (admin.ModelAdmin):
  list_display = ('username', 'email', 'first_name', 'last_name', 'verified', 'is_staff', 'is_active', 'is_superuser', 'date_joined')
  list_filter = ('is_active', 'is_staff', 'is_superuser', 'verified')
  search_fields = ('username', 'email', 'first_name', 'last_name')
  date_hierarchy = 'date_joined'
  fields = (
    'username',
    ('first_name', 'last_name'),
    'email',
    'verified',
    'set_password',
    ('is_active', 'newsletter'),
    ('is_staff', 'is_superuser'),
    'groups',
  )
  
  filter_horizontal = ('groups',)
  form = UserForm
  
  def save_model (self, request, obj, form, change):
    if 'set_password' in form.cleaned_data and form.cleaned_data['set_password']:
      obj.set_password(form.cleaned_data['set_password'])
      
    obj.save()
    
admin.site.register(User, UserAdmin)